import { TrackerError } from '../../../shared/contracts/errors'
import type { DailyUsage } from '../../../shared/contracts/dashboard'
import { byKeyUsageUrl } from './private-endpoints'
import { parseByKeyAmount, parseByKeyCost } from './response-schemas'
import Decimal from 'decimal.js'
import { localDateKey } from '../../../shared/dates'

const acceptedTokenKinds = {
  PROMPT_CACHE_HIT_TOKEN: 'inputCacheHit',
  PROMPT_CACHE_MISS_TOKEN: 'inputCacheMiss',
  RESPONSE_TOKEN: 'output'
} as const

async function request(url: URL, token: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'x-client-platform': 'web' },
    redirect: 'error',
    signal: AbortSignal.any([AbortSignal.timeout(15_000), ...(signal ? [signal] : [])])
  }).catch(() => { throw new TrackerError('NETWORK_ERROR', 'Could not reach DeepSeek Platform.', true) })
  if (response.status === 401 || response.status === 403) throw new TrackerError('AUTHENTICATION_FAILED', 'The DeepSeek Platform session has expired.')
  if (response.status === 429) throw new TrackerError('RATE_LIMITED', 'DeepSeek Platform is rate limiting usage checks.', true)
  if (!response.ok) throw new TrackerError('PROVIDER_UNAVAILABLE', `DeepSeek Platform is unavailable (HTTP ${response.status}).`, true)
  return response.json()
}

function dateAtOffset(timestamp: number): string {
  return localDateKey(new Date(timestamp * 1000))
}

export interface UsageResult {
  daily: DailyUsage[]
  fetchedAt: string
  coverage: { start: string; end: string }
}

export async function fetchPrivateUsage(token: string, days: 7 | 30, signal?: AbortSignal): Promise<UsageResult> {
  const end = new Date()
  end.setHours(24, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  const [amountRaw, costRaw] = await Promise.all([
    request(byKeyUsageUrl('amount', start, end), token, signal),
    request(byKeyUsageUrl('cost', start, end), token, signal)
  ])
  const amount = parseByKeyAmount(amountRaw)
  const cost = parseByKeyCost(costRaw)
  const daysByDate = new Map<string, DailyUsage>()

  const getDay = (timestamp: number): DailyUsage => {
    const date = dateAtOffset(timestamp)
    const existing = daysByDate.get(date)
    if (existing) return existing
    const day: DailyUsage = {
      date,
      costs: [],
      tokens: { inputCacheHit: '0', inputCacheMiss: '0', output: '0' },
      state: 'COMPLETE'
    }
    daysByDate.set(date, day)
    return day
  }

  for (const series of amount.series ?? []) {
    for (const bucket of series.buckets ?? []) {
      const day = getDay(bucket.time)
      for (const [type, value] of Object.entries(bucket.usage ?? {})) {
        const key = acceptedTokenKinds[type as keyof typeof acceptedTokenKinds]
        if (key) day.tokens[key] = new Decimal(day.tokens[key]).plus(value).toFixed()
      }
    }
  }

  const blocks = cost.data ?? []
  const block = blocks.find((item) => item.currency === 'CNY') ?? blocks[0]
  if (block) {
    const currency = block.currency?.trim() || 'CNY'
    for (const series of block.series ?? []) {
      for (const bucket of series.buckets ?? []) {
        const day = getDay(bucket.time)
        const existing = day.costs.find((item) => item.currency === currency)
        if (existing) existing.amount = new Decimal(existing.amount).plus(bucket.cost).toFixed()
        else day.costs.push({ currency, amount: bucket.cost })
      }
    }
  }

  return {
    daily: [...daysByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    fetchedAt: new Date().toISOString(),
    coverage: { start: localDateKey(start), end: localDateKey(new Date(end.getTime() - 1)) }
  }
}
