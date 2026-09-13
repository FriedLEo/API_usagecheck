import { describe, expect, it } from 'vitest'
import { localDateKey } from '../src/shared/dates'

describe('localDateKey', () => {
  it('uses the local calendar date when the zone is ahead of UTC', () => {
    // 20:00Z on the 12th is already 04:00 on the 13th in UTC+8.
    expect(localDateKey(new Date('2026-09-12T20:00:00Z'), -480)).toBe('2026-09-13')
  })

  it('uses the local calendar date when the zone is behind UTC', () => {
    // 04:00Z on the 13th is still 23:00 on the 12th in UTC-5.
    expect(localDateKey(new Date('2026-09-13T04:00:00Z'), 300)).toBe('2026-09-12')
  })

  it('matches the UTC date at a zero offset', () => {
    expect(localDateKey(new Date('2026-09-13T04:00:00Z'), 0)).toBe('2026-09-13')
    expect(localDateKey(new Date('2026-09-13T23:59:59Z'), 0)).toBe('2026-09-13')
  })

  it('does not shift the date in the middle of a local day', () => {
    // 12:00Z is 20:00 in UTC+8 — still the same local date.
    expect(localDateKey(new Date('2026-09-13T12:00:00Z'), -480)).toBe('2026-09-13')
  })

  it('rejects an invalid date rather than silently producing a bad key', () => {
    expect(() => localDateKey(new Date('not-a-date'), 0)).toThrow(RangeError)
  })
})
