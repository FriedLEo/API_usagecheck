import { describe, expect, it } from 'vitest'
import { alertsFor, isConnected, sourcesFor, viewTitle } from '../src/renderer/src/providers'
import type { SourceFreshness } from '../src/shared/contracts/dashboard'
import type { CredentialStatus } from '../src/shared/contracts/provider'

const sources: SourceFreshness[] = [
  { source: 'OFFICIAL_BALANCE_API', lastAttemptAt: null, lastSuccessAt: null, isStale: true, error: { code: 'NOT_CONFIGURED', message: 'balance', retryable: false } },
  { source: 'EXPERIMENTAL_PRIVATE_API', lastAttemptAt: null, lastSuccessAt: null, isStale: false, error: null },
  { source: 'ZEN_GO_API', lastAttemptAt: null, lastSuccessAt: null, isStale: true, error: { code: 'AUTHENTICATION_FAILED', message: 'zen', retryable: false } }
]

describe('alertsFor', () => {
  it('surfaces every error on the overview', () => {
    expect(alertsFor(sources, 'home').map((item) => item.source)).toEqual(['OFFICIAL_BALANCE_API', 'ZEN_GO_API'])
  })

  it('scopes errors to the owning provider', () => {
    expect(alertsFor(sources, 'deepseek').map((item) => item.source)).toEqual(['OFFICIAL_BALANCE_API'])
    expect(alertsFor(sources, 'zen').map((item) => item.source)).toEqual(['ZEN_GO_API'])
  })

  it('shows none in settings', () => {
    expect(alertsFor(sources, 'settings')).toEqual([])
  })
})

describe('sourcesFor', () => {
  it('scopes the footer to a provider, and shows everything on the overview', () => {
    expect(sourcesFor(sources, 'deepseek')).toHaveLength(2)
    expect(sourcesFor(sources, 'zen')).toHaveLength(1)
    expect(sourcesFor(sources, 'home')).toHaveLength(3)
  })
})

describe('viewTitle', () => {
  it('names each view', () => {
    expect(viewTitle('home')).toBe('Overview')
    expect(viewTitle('settings')).toBe('Settings')
    expect(viewTitle('deepseek')).toBe('DeepSeek')
    expect(viewTitle('zen')).toBe('OpenCode Zen Go')
  })
})

describe('isConnected', () => {
  it('does not treat an absent credential row as connected', () => {
    expect(isConnected([], 'ZEN_API_KEY')).toBe(false)
  })

  it('accepts configured and session-only states', () => {
    const configured: CredentialStatus[] = [{ kind: 'ZEN_API_KEY', state: 'CONFIGURED' }]
    const session: CredentialStatus[] = [{ kind: 'ZEN_API_KEY', state: 'SESSION_ONLY' }]
    const missing: CredentialStatus[] = [{ kind: 'ZEN_API_KEY', state: 'NOT_CONFIGURED' }]
    expect(isConnected(configured, 'ZEN_API_KEY')).toBe(true)
    expect(isConnected(session, 'ZEN_API_KEY')).toBe(true)
    expect(isConnected(missing, 'ZEN_API_KEY')).toBe(false)
  })
})
