import { describe, expect, it } from 'vitest'
import { headlineQuotaWindow, payAsYouGoCard, quotaCard, quotaReading, severity, todayUsage } from '../src/renderer/src/stats'
import { formatMoney, formatTokens } from '../src/renderer/src/format'
import type { DailyUsage } from '../src/shared/contracts/dashboard'
import type { QuotaWindow } from '../src/shared/contracts/provider'

function makeWindow(overrides: Partial<QuotaWindow> = {}): QuotaWindow {
  // Mirrors the label the provider now emits for the rolling window.
  return { id: 'rolling', label: '5-hour usage', usedPercent: null, remainingPercent: null, resetsAt: null, ...overrides }
}

function makeDay(date: string, overrides: Partial<DailyUsage> = {}): DailyUsage {
  return { date, costs: [], tokens: { inputCacheHit: '0', inputCacheMiss: '0', output: '0' }, state: 'COMPLETE', ...overrides }
}

describe('quotaReading', () => {
  it('prefers usedPercent when the provider sends it', () => {
    expect(quotaReading(makeWindow({ usedPercent: '12' }))).toEqual({ measured: true, percent: 12, readout: '12%' })
  })

  it('keeps up to two decimals from the provider', () => {
    expect(quotaReading(makeWindow({ usedPercent: '0.9' })).readout).toBe('0.9%')
    expect(quotaReading(makeWindow({ usedPercent: '10.567' })).readout).toBe('10.57%')
  })

  it('derives the used percentage from remainingPercent', () => {
    expect(quotaReading(makeWindow({ remainingPercent: '12' }))).toEqual({ measured: true, percent: 88, readout: '12% left' })
  })

  it('reports an unmeasured window rather than implying zero usage', () => {
    expect(quotaReading(makeWindow())).toEqual({ measured: false, percent: 0, readout: 'no reading' })
  })

  it('clamps the bar value but leaves the provider text alone', () => {
    expect(quotaReading(makeWindow({ usedPercent: '140' })).percent).toBe(100)
    expect(quotaReading(makeWindow({ usedPercent: '-5' })).percent).toBe(0)
    expect(quotaReading(makeWindow({ usedPercent: '140' })).readout).toBe('140%')
  })

  it('treats a non-numeric reading as unmeasured', () => {
    expect(quotaReading(makeWindow({ usedPercent: 'n/a' })).measured).toBe(false)
  })
})

describe('severity', () => {
  it('escalates at the warning and critical thresholds', () => {
    expect(severity(0)).toBe('ok')
    expect(severity(69)).toBe('ok')
    expect(severity(70)).toBe('warning')
    expect(severity(89)).toBe('warning')
    expect(severity(90)).toBe('critical')
    expect(severity(100)).toBe('critical')
  })
})

describe('headlineQuotaWindow', () => {
  it('prefers the short rolling window regardless of order', () => {
    const windows = [makeWindow({ id: 'weekly' }), makeWindow({ id: 'rolling' }), makeWindow({ id: 'monthly' })]
    expect(headlineQuotaWindow(windows)?.id).toBe('rolling')
  })

  it('falls back to the first window when there is no rolling window', () => {
    expect(headlineQuotaWindow([makeWindow({ id: 'weekly' }), makeWindow({ id: 'monthly' })])?.id).toBe('weekly')
  })

  it('returns null when there are no windows', () => {
    expect(headlineQuotaWindow([])).toBeNull()
  })
})

describe('todayUsage', () => {
  it('returns spend and total tokens for the matching day', () => {
    const daily = [makeDay('2026-09-12', {
      costs: [{ amount: '1.25', currency: 'CNY' }],
      tokens: { inputCacheHit: '100', inputCacheMiss: '20', output: '5' }
    })]
    expect(todayUsage(daily, '2026-09-12')).toEqual({ spend: [{ amount: '1.25', currency: 'CNY' }], totalTokens: 125 })
  })

  it('keeps multiple currencies separate', () => {
    const daily = [makeDay('2026-09-12', { costs: [{ amount: '1', currency: 'CNY' }, { amount: '2', currency: 'USD' }] })]
    expect(todayUsage(daily, '2026-09-12')?.spend).toEqual([{ amount: '1', currency: 'CNY' }, { amount: '2', currency: 'USD' }])
  })

  it('distinguishes an absent day from a day with no usage', () => {
    expect(todayUsage([makeDay('2026-09-12')], '2026-09-13')).toBeNull()
    expect(todayUsage([makeDay('2026-09-13')], '2026-09-13')).toEqual({ spend: [], totalTokens: 0 })
  })

  it('sums large token counts without float drift', () => {
    const daily = [makeDay('2026-09-13', { tokens: { inputCacheHit: '999999999999', inputCacheMiss: '1', output: '0' } })]
    expect(todayUsage(daily, '2026-09-13')?.totalTokens).toBe(1000000000000)
  })
})

// Formatting itself is covered with explicit locales in format.test.ts; these
// assert the branching and that the card routes values through the formatters.
describe('payAsYouGoCard', () => {
  it('prompts to connect when the Platform session is missing', () => {
    expect(payAsYouGoCard({ connected: false, usage: null, hasHistory: true })).toEqual({
      kind: 'PAY_AS_YOU_GO', connected: false, headline: 'Not connected', secondary: 'Connect a Platform session in Settings'
    })
  })

  it('waits for the first sync when there is no history at all', () => {
    expect(payAsYouGoCard({ connected: true, usage: null, hasHistory: false })).toMatchObject({
      headline: 'Waiting for first reading…', secondary: 'Usage appears after the first sync'
    })
  })

  it('distinguishes an absent day from a day with no usage', () => {
    expect(payAsYouGoCard({ connected: true, usage: null, hasHistory: true })).toMatchObject({
      headline: 'No usage today', secondary: 'Nothing recorded yet today'
    })
    expect(payAsYouGoCard({ connected: true, usage: { spend: [], totalTokens: 0 }, hasHistory: true })).toMatchObject({
      headline: 'No usage today', secondary: '0 tokens'
    })
  })

  it('shows spend and tokens for a day with usage', () => {
    const stat = payAsYouGoCard({
      connected: true,
      usage: { spend: [{ amount: '1', currency: 'CNY' }, { amount: '2', currency: 'USD' }], totalTokens: 1234567 },
      hasHistory: true
    })
    expect(stat.headline).toBe([formatMoney('1', 'CNY'), formatMoney('2', 'USD')].join(' · '))
    expect(stat.secondary).toBe(`${formatTokens(1234567)} tokens`)
  })

  it('shows a gap rather than a fake zero when a day has tokens but no cost data', () => {
    const stat = payAsYouGoCard({ connected: true, usage: { spend: [], totalTokens: 42 }, hasHistory: true })
    expect(stat.headline).toBe('—')
    expect(stat.secondary).toBe(`${formatTokens(42)} tokens`)
  })
})

describe('quotaCard', () => {
  it('prompts to connect when the key is missing, and drops any stale window', () => {
    expect(quotaCard({ connected: false, entry: makeWindow({ usedPercent: '10' }), errorMessage: null })).toEqual({
      kind: 'QUOTA', connected: false, headline: 'Not connected', secondary: 'Add an OpenCode Zen API key in Settings', entry: null
    })
  })

  it('surfaces the provider error while waiting for a first reading', () => {
    expect(quotaCard({ connected: true, entry: null, errorMessage: 'The OpenCode Zen API key was rejected.' }).secondary)
      .toBe('The OpenCode Zen API key was rejected.')
    expect(quotaCard({ connected: true, entry: null, errorMessage: null }).secondary).toBe('Quota appears after the first read')
  })

  it('reports an unmeasured window instead of implying zero usage', () => {
    const stat = quotaCard({ connected: true, entry: makeWindow(), errorMessage: null })
    expect(stat.headline).toBe('Quota reading unavailable')
    expect(stat.entry).not.toBeNull()
  })

  it('shows the reading, the window label and a reset countdown', () => {
    const resetsAt = new Date(Date.now() + 3 * 3600_000 + 20 * 60_000 + 45_000).toISOString()
    const stat = quotaCard({ connected: true, entry: makeWindow({ usedPercent: '12', resetsAt }), errorMessage: null })
    expect(stat.headline).toBe('12%')
    expect(stat.secondary).toMatch(/^5-hour usage · resets in \d+h \d+m$/)
  })

  it('still reports a reading when no reset time was sent', () => {
    const stat = quotaCard({ connected: true, entry: makeWindow({ remainingPercent: '88' }), errorMessage: null })
    expect(stat.headline).toBe('88% left')
    expect(stat.secondary).toBe('5-hour usage')
  })
})
