import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZEN_PERCENT_IS_USED, fetchZenQuota, parseZenUsage, toQuotaWindows } from '../src/main/providers/opencode/zen-usage-client'
import { ZenQuotaService } from '../src/main/providers/opencode/zen-quota-service'
import type { CredentialVault } from '../src/main/credentials/credential-vault'
import type { QuotaSnapshot } from '../src/shared/contracts/provider'

const sample = {
  usage: {
    rolling: { status: 'ok', percent: 12, resetsAt: '2026-09-13T15:00:00.000Z' },
    weekly: { status: 'ok', percent: '34', resetsAt: '2026-09-15T00:00:00.000Z' },
    monthly: { status: 'ok', percent: 56, resetsAt: null }
  }
}

function response(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function fakeVault(key: string | null): CredentialVault {
  return {
    initialize: async () => undefined,
    get: async () => key,
    save: async (kind) => ({ kind, state: 'CONFIGURED' }),
    clear: async (kind) => ({ kind, state: 'NOT_CONFIGURED' }),
    status: (kind) => ({ kind, state: key ? 'CONFIGURED' : 'NOT_CONFIGURED' })
  }
}

class FakeStore {
  value: QuotaSnapshot | null = null
  getZenQuota(): QuotaSnapshot | null { return this.value }
  setZenQuota(next: QuotaSnapshot): void { this.value = next }
}

const storedSnapshot: QuotaSnapshot = {
  windows: [{ id: 'rolling', label: 'Rolling', usedPercent: '12', remainingPercent: null, resetsAt: null }],
  fetchedAt: '2026-09-13T00:00:00.000Z'
}

afterEach(() => { vi.unstubAllGlobals() })

describe('toQuotaWindows', () => {
  it('maps the known windows in a stable order and fills usedPercent', () => {
    const windows = toQuotaWindows(parseZenUsage(sample))
    expect(windows.map((entry) => entry.id)).toEqual(['rolling', 'weekly', 'monthly'])
    expect(windows.map((entry) => entry.label)).toEqual(['5-hour usage', 'Weekly usage', 'Monthly usage'])
    expect(ZEN_PERCENT_IS_USED).toBe(true)
    expect(windows[0]?.usedPercent).toBe('12')
    expect(windows[0]?.remainingPercent).toBeNull()
    expect(windows[1]?.usedPercent).toBe('34')
    expect(windows[2]?.resetsAt).toBeNull()
  })

  it('clamps out-of-range percentages to 0..100', () => {
    const windows = toQuotaWindows(parseZenUsage({ usage: { rolling: { percent: 140 }, weekly: { percent: -5 } } }))
    expect(windows[0]?.usedPercent).toBe('100')
    expect(windows[1]?.usedPercent).toBe('0')
  })

  it('tolerates missing percentages and unparseable reset times', () => {
    const windows = toQuotaWindows(parseZenUsage({ usage: { weekly: { resetsAt: 'not-a-date' } } }))
    expect(windows).toHaveLength(1)
    expect(windows[0]?.usedPercent).toBeNull()
    expect(windows[0]?.remainingPercent).toBeNull()
    expect(windows[0]?.resetsAt).toBeNull()
  })

  it('retains a non-ok status and includes unknown extra windows', () => {
    const windows = toQuotaWindows(parseZenUsage({ usage: { rolling: { status: 'blocked', percent: 100 }, daily: { percent: 5 } } }))
    expect(windows[0]?.status).toBe('blocked')
    expect(windows.map((entry) => entry.id)).toEqual(['rolling', 'daily'])
  })

  it('throws when the usage object is absent', () => {
    expect(() => parseZenUsage({ something: 'else' })).toThrow()
  })
})

describe('fetchZenQuota', () => {
  it('returns windows on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(200, sample)))
    const snapshot = await fetchZenQuota('key')
    expect(snapshot.windows).toHaveLength(3)
    expect(snapshot.fetchedAt).toBeTruthy()
  })

  it('authenticates against the documented endpoint with the bearer key', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return response(200, sample)
    }))
    await fetchZenQuota('secret-key')
    expect(calls[0]?.url).toBe('https://opencode.ai/zen/go/v1/usage')
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe('Bearer secret-key')
  })

  it.each([
    [401, 'AUTHENTICATION_FAILED'],
    [403, 'AUTHENTICATION_FAILED'],
    [402, 'PAYMENT_REQUIRED'],
    [404, 'PROVIDER_UNAVAILABLE'],
    [429, 'RATE_LIMITED'],
    [500, 'PROVIDER_UNAVAILABLE']
  ])('maps HTTP %i to %s', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn(async () => response(status)))
    await expect(fetchZenQuota('key')).rejects.toMatchObject({ code })
  })

  it('maps a transport failure to NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    await expect(fetchZenQuota('key')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })

  it('maps a non-JSON body to PRIVATE_API_CHANGED', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })))
    await expect(fetchZenQuota('key')).rejects.toMatchObject({ code: 'PRIVATE_API_CHANGED' })
  })

  it('maps an unexpected shape to PRIVATE_API_CHANGED', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(200, { usageWindows: [] })))
    await expect(fetchZenQuota('key')).rejects.toMatchObject({ code: 'PRIVATE_API_CHANGED' })
  })
})

describe('ZenQuotaService', () => {
  it('stays silent when no key is configured, but keeps stored windows', async () => {
    const fetchMock = vi.fn(async () => response(200, sample))
    vi.stubGlobal('fetch', fetchMock)
    const store = new FakeStore()
    store.value = storedSnapshot
    const service = new ZenQuotaService(fakeVault(null), store)

    await service.refresh()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(service.freshness()).toEqual([])
    expect(service.quotaWindows()).toHaveLength(1)
  })

  it('persists a successful read and reports fresh', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(200, sample)))
    const store = new FakeStore()
    const service = new ZenQuotaService(fakeVault('key'), store)

    await service.refresh()

    expect(store.value?.windows).toHaveLength(3)
    const [row] = service.freshness()
    expect(row?.isStale).toBe(false)
    expect(row?.error).toBeNull()
    expect(row?.lastSuccessAt).toBeTruthy()
  })

  it('retains last known windows and flags stale on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(401)))
    const store = new FakeStore()
    store.value = storedSnapshot
    const service = new ZenQuotaService(fakeVault('bad'), store)

    await service.refresh()

    expect(service.quotaWindows()).toHaveLength(1)
    const [row] = service.freshness()
    expect(row?.isStale).toBe(true)
    expect(row?.error?.code).toBe('AUTHENTICATION_FAILED')
  })

  it('never throws on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('boom') }))
    const service = new ZenQuotaService(fakeVault('key'), new FakeStore())
    await expect(service.refresh()).resolves.toBeUndefined()
  })
})
