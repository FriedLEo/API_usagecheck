import type { PricingPeriodSnapshot } from '../../shared/contracts/dashboard'
import { deepSeekPricingCatalog, DEEPSEEK_PRICING_REVIEWED_AT, DEEPSEEK_PRICING_SOURCE } from '../../shared/pricing/deepseek-catalog'

const peakWindows = [[1, 4], [6, 10]] as const

function isWeekday(date: Date): boolean {
  const day = date.getUTCDay()
  return day >= 1 && day <= 5
}

function isPeak(date: Date): boolean {
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  return isWeekday(date) && peakWindows.some(([start, end]) => hour >= start && hour < end)
}

function findTransition(date: Date): Date {
  const initial = isPeak(date)
  const candidate = new Date(date)
  candidate.setUTCSeconds(0, 0)
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1)
  for (let minutes = 0; minutes < 7 * 24 * 60 + 1; minutes += 1) {
    if (isPeak(candidate) !== initial) return candidate
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1)
  }
  throw new Error('Could not determine the next DeepSeek pricing transition')
}

function findPeriodStart(date: Date): Date {
  const initial = isPeak(date)
  const candidate = new Date(date)
  candidate.setUTCSeconds(0, 0)
  for (let minutes = 0; minutes < 7 * 24 * 60 + 1; minutes += 1) {
    const previous = new Date(candidate.getTime() - 60_000)
    if (isPeak(previous) !== initial) return candidate
    candidate.setUTCMinutes(candidate.getUTCMinutes() - 1)
  }
  return date
}

export function getPricingPeriod(
  at = new Date(),
  model: 'deepseek-flash' | 'deepseek-v4-pro' = 'deepseek-flash'
): PricingPeriodSnapshot {
  const peak = isPeak(at)
  const pricing = deepSeekPricingCatalog[model]
  return {
    kind: peak ? 'PEAK' : 'OFF_PEAK',
    startedAt: findPeriodStart(at).toISOString(),
    nextTransitionAt: findTransition(at).toISOString(),
    nextKind: peak ? 'OFF_PEAK' : 'PEAK',
    model,
    current: peak ? pricing.peak : pricing.offPeak,
    alternate: peak ? pricing.offPeak : pricing.peak,
    sourceUrl: DEEPSEEK_PRICING_SOURCE,
    reviewedAt: DEEPSEEK_PRICING_REVIEWED_AT
  }
}
