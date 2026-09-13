import type { Money } from './domain'

export type ProviderId = 'deepseek' | (string & {})
export type CredentialKind = 'API_KEY' | 'PLATFORM_TOKEN' | 'ZEN_API_KEY'

export interface ProviderCapabilities {
  balance: boolean
  monetaryUsage: boolean
  tokenUsage: boolean
  pricingPeriods: boolean
  quotaWindows: boolean
}

export interface ProviderManifest {
  id: ProviderId
  displayName: string
  capabilities: ProviderCapabilities
  accountUrl: string
  pricingUrl: string
}

export interface QuotaWindow {
  id: string
  label: string
  usedPercent: string | null
  remainingPercent: string | null
  resetsAt: string | null
  /**
   * Provider-reported window state (for example `ok`, or a blocked/exhausted
   * marker). Optional because not every provider reports one; when absent the
   * UI must not imply the window is healthy.
   */
  status?: string | null
}

/** A provider-reported set of quota windows and when they were read. */
export interface QuotaSnapshot {
  windows: QuotaWindow[]
  fetchedAt: string
}

export interface ProviderBalance {
  isAvailable: boolean
  balances: Array<Money & { granted: string; toppedUp: string }>
  fetchedAt: string
}

export interface CredentialStatus {
  kind: CredentialKind
  state: 'NOT_CONFIGURED' | 'CONFIGURED' | 'SESSION_ONLY' | 'EXPIRED' | 'UNAVAILABLE'
}
