import Decimal from 'decimal.js'
import type { DashboardSnapshot, DailyUsage, SourceFreshness } from '../../shared/contracts/dashboard'
import type { ProviderBalance, QuotaWindow } from '../../shared/contracts/provider'
import { getPricingPeriod } from '../pricing/pricing-period-service'
import { localDateKey } from '../../shared/dates'

function sumTokens(daily: DailyUsage[]) {
  return daily.reduce((total, day) => ({
    inputCacheHit: new Decimal(total.inputCacheHit).plus(day.tokens.inputCacheHit).toFixed(),
    inputCacheMiss: new Decimal(total.inputCacheMiss).plus(day.tokens.inputCacheMiss).toFixed(),
    output: new Decimal(total.output).plus(day.tokens.output).toFixed()
  }), { inputCacheHit: '0', inputCacheMiss: '0', output: '0' })
}

function sumMoney(daily: DailyUsage[]) {
  const totals = new Map<string, Decimal>()
  for (const day of daily) for (const money of day.costs) totals.set(money.currency, (totals.get(money.currency) ?? new Decimal(0)).plus(money.amount))
  return [...totals].map(([currency, amount]) => ({ currency, amount: amount.toFixed() }))
}

/**
 * Bounds daily history to the last `rangeDays` local days, returning the
 * inclusive `start`/`end` date keys alongside the retained rows.
 *
 * The bounds must be local dates because provider buckets are local-keyed; see
 * `localDateKey` for why a UTC-derived bound silently drops the current day.
 */
export function filterDailyRange(
  daily: DailyUsage[],
  rangeDays: number,
  now: Date = new Date(),
  offsetMinutes: number = now.getTimezoneOffset()
): { start: string; end: string; daily: DailyUsage[] } {
  const end = localDateKey(now, offsetMinutes)
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - rangeDays + 1)
  const start = localDateKey(startDate, offsetMinutes)
  return { start, end, daily: daily.filter((day) => day.date >= start && day.date <= end) }
}

export function aggregateDashboard(input: {
  balance: ProviderBalance | null
  daily: DailyUsage[]
  coverage: { start: string; end: string } | null
  rangeDays: 7 | 30
  model: 'deepseek-flash' | 'deepseek-v4-pro'
  freshness: SourceFreshness[]
  quotaWindows?: QuotaWindow[]
}): DashboardSnapshot {
  const { start, end, daily } = filterDailyRange(input.daily, input.rangeDays)
  return {
    providerId: 'deepseek',
    balance: input.balance?.balances ?? [],
    cumulativeSpend: sumMoney(input.daily),
    cumulativeLabel: input.coverage ? `Tracked since ${input.coverage.start}` : 'Not connected',
    selectedRange: { start, end, spend: sumMoney(daily), tokens: sumTokens(daily) },
    daily,
    pricing: getPricingPeriod(new Date(), input.model),
    quotaWindows: input.quotaWindows ?? [],
    coverage: { start: input.coverage?.start ?? null, end: input.coverage?.end ?? null, timeZone: 'Local fixed offset' },
    freshness: input.freshness
  }
}
