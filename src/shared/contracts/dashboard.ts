import type { BillingDate, Money, TokenBreakdown } from './domain'
import type { AppError } from './errors'
import type { QuotaWindow } from './provider'

export interface DailyUsage {
  date: BillingDate
  costs: Money[]
  tokens: TokenBreakdown
  state: 'COMPLETE' | 'PARTIAL' | 'MISSING'
}

export interface PricingRate {
  cacheHitInput: string
  cacheMissInput: string
  output: string
  currency: string
  unit: 'PER_MILLION_TOKENS'
}

export interface PricingPeriodSnapshot {
  kind: 'PEAK' | 'OFF_PEAK'
  startedAt: string
  nextTransitionAt: string
  nextKind: 'PEAK' | 'OFF_PEAK'
  model: string
  current: PricingRate
  alternate: PricingRate
  sourceUrl: string
  reviewedAt: string
}

export interface SourceFreshness {
  source: 'OFFICIAL_BALANCE_API' | 'EXPERIMENTAL_PRIVATE_API' | 'ZEN_GO_API'
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  isStale: boolean
  error: AppError | null
}

export interface DashboardSnapshot {
  providerId: string
  balance: Array<Money & { granted: string; toppedUp: string }>
  cumulativeSpend: Money[]
  cumulativeLabel: string
  selectedRange: {
    start: BillingDate
    end: BillingDate
    spend: Money[]
    tokens: TokenBreakdown
  }
  daily: DailyUsage[]
  pricing: PricingPeriodSnapshot
  quotaWindows: QuotaWindow[]
  coverage: { start: BillingDate | null; end: BillingDate | null; timeZone: string }
  freshness: SourceFreshness[]
}
