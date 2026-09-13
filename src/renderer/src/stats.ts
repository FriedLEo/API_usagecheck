import Decimal from 'decimal.js'
import type { DailyUsage } from '../../shared/contracts/dashboard'
import type { Money } from '../../shared/contracts/domain'
import type { QuotaWindow } from '../../shared/contracts/provider'
import { countdown, formatMoney, formatPercent, formatTokens } from './format'

export interface QuotaReading {
  /** False when the provider sent no usable percentage. */
  measured: boolean
  /** Percentage *used*, normalised to 0..100. Meaningless when unmeasured. */
  percent: number
  /** Display text, e.g. `12% used` / `88% left`. */
  readout: string
}

/**
 * Resolves a window's percentage without assuming whether the provider reports
 * used or remaining quota — that semantic is still unverified, so we render
 * whichever field it actually populated. Shared by the Home card and the Zen
 * detail panel so the two can never disagree.
 */
export function quotaReading(entry: QuotaWindow): QuotaReading {
  const used = entry.usedPercent !== null
    ? Number(entry.usedPercent)
    : entry.remainingPercent !== null ? 100 - Number(entry.remainingPercent) : null
  const measured = used !== null && Number.isFinite(used)
  const percent = measured ? Math.min(100, Math.max(0, used)) : 0
  // The window label already says "usage", so a bare percentage reads correctly.
  const readout = entry.usedPercent !== null
    ? formatPercent(entry.usedPercent)
    : entry.remainingPercent !== null ? `${formatPercent(entry.remainingPercent)} left` : 'no reading'
  return { measured, percent, readout }
}

/** Bar severity so an exhausted window reads at a glance. */
export function severity(percent: number): string {
  if (percent >= 90) return 'critical'
  if (percent >= 70) return 'warning'
  return 'ok'
}

/** The window a quota card headlines: the short rolling window when present. */
export function headlineQuotaWindow(windows: QuotaWindow[]): QuotaWindow | null {
  return windows.find((entry) => entry.id === 'rolling') ?? windows[0] ?? null
}

export interface TodayUsage {
  spend: Money[]
  totalTokens: number
}

/**
 * Today's usage from the daily history. Returns `null` when there is no bucket
 * for `todayKey` — deliberately distinct from a bucket that exists and is zero,
 * which means "no usage today" rather than "no data yet".
 */
export function todayUsage(daily: DailyUsage[], todayKey: string): TodayUsage | null {
  const today = daily.find((entry) => entry.date === todayKey)
  if (!today) return null
  const tokens = today.tokens
  return {
    spend: today.costs.map((cost) => ({ amount: cost.amount, currency: cost.currency })),
    totalTokens: new Decimal(tokens.inputCacheHit).plus(tokens.inputCacheMiss).plus(tokens.output).toNumber()
  }
}

export interface PayAsYouGoCardStat {
  kind: 'PAY_AS_YOU_GO'
  connected: boolean
  headline: string
  secondary: string
}

export interface QuotaCardStat {
  kind: 'QUOTA'
  connected: boolean
  headline: string
  secondary: string
  entry: QuotaWindow | null
}

export type CardStat = PayAsYouGoCardStat | QuotaCardStat

/** Home card copy for a pay-as-you-go provider. Pure, so every state is testable. */
export function payAsYouGoCard({ connected, usage, hasHistory }: {
  connected: boolean
  usage: TodayUsage | null
  hasHistory: boolean
}): PayAsYouGoCardStat {
  if (!connected) {
    return { kind: 'PAY_AS_YOU_GO', connected: false, headline: 'Not connected', secondary: 'Connect a Platform session in Settings' }
  }
  if (!hasHistory) {
    return { kind: 'PAY_AS_YOU_GO', connected: true, headline: 'Waiting for first reading…', secondary: 'Usage appears after the first sync' }
  }
  if (!usage) {
    return { kind: 'PAY_AS_YOU_GO', connected: true, headline: 'No usage today', secondary: 'Nothing recorded yet today' }
  }
  const tokens = `${formatTokens(usage.totalTokens)} tokens`
  if (usage.spend.length === 0 && usage.totalTokens === 0) {
    return { kind: 'PAY_AS_YOU_GO', connected: true, headline: 'No usage today', secondary: tokens }
  }
  // A day can carry tokens without cost data; show the gap rather than a fake zero.
  const headline = usage.spend.length === 0
    ? '—'
    : usage.spend.map((money) => formatMoney(money.amount, money.currency)).join(' · ')
  return { kind: 'PAY_AS_YOU_GO', connected: true, headline, secondary: tokens }
}

/** Home card copy for a quota provider. */
export function quotaCard({ connected, entry, errorMessage }: {
  connected: boolean
  entry: QuotaWindow | null
  errorMessage: string | null
}): QuotaCardStat {
  if (!connected) {
    return { kind: 'QUOTA', connected: false, headline: 'Not connected', secondary: 'Add an OpenCode Zen API key in Settings', entry: null }
  }
  if (!entry) {
    return { kind: 'QUOTA', connected: true, headline: 'Waiting for first reading…', secondary: errorMessage ?? 'Quota appears after the first read', entry: null }
  }
  const reading = quotaReading(entry)
  if (!reading.measured) {
    return {
      kind: 'QUOTA', connected: true, headline: 'Quota reading unavailable',
      secondary: entry.resetsAt ? `Resets in ${countdown(entry.resetsAt)}` : 'No reset time reported', entry
    }
  }
  return {
    kind: 'QUOTA', connected: true, headline: reading.readout,
    secondary: entry.resetsAt ? `${entry.label} · resets in ${countdown(entry.resetsAt)}` : entry.label,
    entry
  }
}
