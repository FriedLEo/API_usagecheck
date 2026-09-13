import { describe, expect, it } from 'vitest'
import { getPricingPeriod } from '../src/main/pricing/pricing-period-service'

describe('DeepSeek pricing period', () => {
  it('enters the first weekday peak window at 01:00 UTC', () => {
    expect(getPricingPeriod(new Date('2026-09-14T00:59:59Z')).kind).toBe('OFF_PEAK')
    expect(getPricingPeriod(new Date('2026-09-14T01:00:00Z')).kind).toBe('PEAK')
  })

  it('handles both weekday windows and weekend off-peak', () => {
    expect(getPricingPeriod(new Date('2026-09-14T04:00:00Z')).kind).toBe('OFF_PEAK')
    expect(getPricingPeriod(new Date('2026-09-14T06:00:00Z')).kind).toBe('PEAK')
    expect(getPricingPeriod(new Date('2026-09-19T06:00:00Z')).kind).toBe('OFF_PEAK')
  })

  it('returns the exact next transition', () => {
    expect(getPricingPeriod(new Date('2026-09-14T02:15:00Z')).nextTransitionAt).toBe('2026-09-14T04:00:00.000Z')
  })
})
