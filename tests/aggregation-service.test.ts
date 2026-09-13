import { describe, expect, it } from 'vitest'
import { filterDailyRange } from '../src/main/services/aggregation-service'
import type { DailyUsage } from '../src/shared/contracts/dashboard'

function day(date: string): DailyUsage {
  return { date, costs: [], tokens: { inputCacheHit: '0', inputCacheMiss: '0', output: '0' }, state: 'COMPLETE' }
}

const daily = [
  '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'
].map(day)

describe('filterDailyRange', () => {
  it('keeps the current local day when the zone is ahead of UTC', () => {
    // 20:00Z on the 12th is 04:00 on the 13th in UTC+8, so the 13th is "today".
    const result = filterDailyRange(daily, 7, new Date('2026-09-12T20:00:00Z'), -480)
    expect(result.end).toBe('2026-09-13')
    expect(result.start).toBe('2026-09-07')
    expect(result.daily).toHaveLength(7)
    expect(result.daily.map((entry) => entry.date)).toContain('2026-09-13')
  })

  it('covers a full window when the zone is behind UTC', () => {
    // 04:00Z on the 13th is 23:00 on the 12th in UTC-5, so the 12th is "today".
    const result = filterDailyRange(daily, 7, new Date('2026-09-13T04:00:00Z'), 300)
    expect(result.end).toBe('2026-09-12')
    expect(result.start).toBe('2026-09-06')
    expect(result.daily).toHaveLength(7)
  })

  it('agrees with a UTC bound at a zero offset', () => {
    const result = filterDailyRange(daily, 7, new Date('2026-09-13T04:00:00Z'), 0)
    expect(result.end).toBe('2026-09-13')
    expect(result.start).toBe('2026-09-07')
    expect(result.daily).toHaveLength(7)
  })

  it('excludes days outside the window', () => {
    const result = filterDailyRange(daily, 3, new Date('2026-09-13T12:00:00Z'), 0)
    expect(result.daily.map((entry) => entry.date)).toEqual(['2026-09-11', '2026-09-12', '2026-09-13'])
  })
})
