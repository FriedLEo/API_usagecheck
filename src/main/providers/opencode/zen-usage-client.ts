import { z } from 'zod'
import type { QuotaSnapshot, QuotaWindow } from '../../../shared/contracts/provider'
import { TrackerError } from '../../../shared/contracts/errors'
import { logger } from '../../security/redacted-logger'

const ZEN_GO_USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'

/**
 * Whether the provider's `percent` field means *used* or *remaining* quota.
 *
 * Confirmed by the Zen console, which heads each window "usage" and prints this
 * number beside it (for example "5-hour usage … 0.9%"), so the value is quota
 * consumed. `toQuotaWindows` still fills exactly one of
 * `usedPercent`/`remainingPercent` so the UI renders whichever one a provider
 * populated rather than assuming.
 */
export const ZEN_PERCENT_IS_USED = true

// Deliberately loose: the response is undocumented, so tolerate missing fields.
const windowSchema = z.object({
  status: z.string().nullish(),
  percent: z.union([z.number(), z.string()]).nullish(),
  resetsAt: z.string().nullish()
}).passthrough()

const zenUsageSchema = z.object({
  usage: z.object({
    rolling: windowSchema.optional(),
    weekly: windowSchema.optional(),
    monthly: windowSchema.optional()
  }).passthrough()
}).passthrough()

export type ZenUsage = z.infer<typeof zenUsageSchema>
type ZenWindow = z.infer<typeof windowSchema>

const knownOrder = ['rolling', 'weekly', 'monthly']
// Names follow the Zen console, where the rolling window is labelled "5-hour usage".
const labels: Record<string, string> = { rolling: '5-hour usage', weekly: 'Weekly usage', monthly: 'Monthly usage' }

export function parseZenUsage(input: unknown): ZenUsage {
  return zenUsageSchema.parse(input)
}

/** Accepts a number or numeric string; rejects non-finite and clamps to 0..100. */
function toPercent(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value.trim())
  if (!Number.isFinite(parsed)) return null
  const clamped = Math.min(100, Math.max(0, parsed))
  // Drop float noise without inventing precision.
  return String(Math.round(clamped * 100) / 100)
}

/** Keeps a reset instant only if the provider sent a parseable date. */
function toResetIso(value: string | null | undefined): string | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

/**
 * Maps a parsed Zen payload onto the shared quota-window contract. Pure, so the
 * undocumented-response handling is unit-testable without network access.
 */
export function toQuotaWindows(usage: ZenUsage): QuotaWindow[] {
  const container: Record<string, unknown> = usage.usage
  // Known windows first in a stable order, then anything new the provider added.
  const keys = [...knownOrder, ...Object.keys(container).filter((key) => !knownOrder.includes(key))]
  return keys.flatMap((key) => {
    const parsed = windowSchema.safeParse(container[key])
    if (!parsed.success) return []
    const window: ZenWindow = parsed.data
    const percent = toPercent(window.percent)
    return [{
      id: key,
      label: labels[key] ?? key,
      usedPercent: ZEN_PERCENT_IS_USED ? percent : null,
      remainingPercent: ZEN_PERCENT_IS_USED ? null : percent,
      resetsAt: toResetIso(window.resetsAt),
      status: window.status ?? null
    }]
  })
}

function topLevelKeys(payload: unknown): string[] {
  return payload !== null && typeof payload === 'object' ? Object.keys(payload) : []
}

export async function fetchZenQuota(apiKey: string, signal?: AbortSignal): Promise<QuotaSnapshot> {
  const response = await fetch(ZEN_GO_USAGE_URL, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.any([AbortSignal.timeout(12_000), ...(signal ? [signal] : [])])
  }).catch((error: unknown) => {
    if (error instanceof TrackerError) throw error
    throw new TrackerError('NETWORK_ERROR', 'Could not reach OpenCode Zen.', true)
  })

  if (response.status === 401 || response.status === 403) throw new TrackerError('AUTHENTICATION_FAILED', 'The OpenCode Zen API key was rejected.')
  if (response.status === 402) throw new TrackerError('PAYMENT_REQUIRED', 'This OpenCode Zen account has no Go subscription or available credit.')
  if (response.status === 404) throw new TrackerError('PROVIDER_UNAVAILABLE', 'The experimental Zen usage endpoint is unavailable (HTTP 404). It may have been removed.', true)
  if (response.status === 429) throw new TrackerError('RATE_LIMITED', 'OpenCode Zen is rate limiting usage checks.', true)
  if (!response.ok) throw new TrackerError('PROVIDER_UNAVAILABLE', `OpenCode Zen is unavailable (HTTP ${response.status}).`, true)

  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > 1_000_000) throw new TrackerError('VALIDATION_FAILED', 'OpenCode Zen returned an unexpectedly large usage response.')

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new TrackerError('PRIVATE_API_CHANGED', 'OpenCode Zen returned a usage response that was not JSON.')
  }

  try {
    return { windows: toQuotaWindows(parseZenUsage(payload)), fetchedAt: new Date().toISOString() }
  } catch (error) {
    if (error instanceof TrackerError) throw error
    if (error instanceof z.ZodError) {
      // Undocumented interface: log only the shape so the schema can be repaired quickly.
      logger.error('OpenCode Zen usage response no longer matches the expected format', topLevelKeys(payload))
      throw new TrackerError('PRIVATE_API_CHANGED', 'OpenCode Zen changed the usage response format.')
    }
    throw new TrackerError('VALIDATION_FAILED', 'OpenCode Zen returned invalid usage data.')
  }
}
