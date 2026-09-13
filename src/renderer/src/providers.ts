import type { SourceFreshness } from '../../shared/contracts/dashboard'
import type { CredentialKind, CredentialStatus } from '../../shared/contracts/provider'

/**
 * A credential counts as connected only when the vault reports a real state.
 * An absent row must not read as connected — `undefined !== 'NOT_CONFIGURED'` is true.
 */
export function isConnected(credentials: CredentialStatus[], kind: CredentialKind): boolean {
  const state = credentials.find((item) => item.kind === kind)?.state
  return state === 'CONFIGURED' || state === 'SESSION_ONLY'
}

export type ProviderView = 'deepseek' | 'zen'
export type AppView = 'home' | 'settings' | ProviderView
/** Direction of travel, so a view arrives from the side it will leave towards. */
export type NavDirection = 'forward' | 'back' | 'none'

export interface ProviderTab {
  id: ProviderView
  name: string
  subtitle: string
  kind: 'PAY_AS_YOU_GO' | 'QUOTA'
  /**
   * The credential this provider's headline stat depends on. For DeepSeek that
   * is the Platform session, not the API key — the API key only carries balance.
   */
  primaryCredential: CredentialKind
}

/**
 * Static provider descriptors. The main process does not advertise manifests to
 * the renderer yet (`BootstrapPayload` carries only settings and credentials),
 * so with two providers a local list is the smaller change. A third provider
 * would be the point to plumb `ProviderManifest` through bootstrap instead.
 */
export const providerTabs: readonly ProviderTab[] = [
  { id: 'deepseek', name: 'DeepSeek', subtitle: 'API · pay as you use', kind: 'PAY_AS_YOU_GO', primaryCredential: 'PLATFORM_TOKEN' },
  { id: 'zen', name: 'OpenCode Zen Go', subtitle: 'Subscription quota · experimental', kind: 'QUOTA', primaryCredential: 'ZEN_API_KEY' }
]

/** Human label per freshness source. `Record` over the union keeps this exhaustive. */
export const sourceLabels: Record<SourceFreshness['source'], string> = {
  OFFICIAL_BALANCE_API: 'Balance',
  EXPERIMENTAL_PRIVATE_API: 'Usage',
  ZEN_GO_API: 'Zen Go'
}

/** Which provider owns each freshness source, so a detail page shows only its own alerts. */
export const sourceOwner: Record<SourceFreshness['source'], ProviderView> = {
  OFFICIAL_BALANCE_API: 'deepseek',
  EXPERIMENTAL_PRIVATE_API: 'deepseek',
  ZEN_GO_API: 'zen'
}

export function viewTitle(view: AppView): string {
  if (view === 'home') return 'Overview'
  if (view === 'settings') return 'Settings'
  return providerTabs.find((tab) => tab.id === view)?.name ?? 'Overview'
}

/** Freshness rows to show as alerts for a view. Home surfaces every problem. */
export function alertsFor(freshness: SourceFreshness[], view: AppView): SourceFreshness[] {
  if (view === 'settings') return []
  const withError = freshness.filter((item) => item.error)
  if (view === 'home') return withError
  return withError.filter((item) => sourceOwner[item.source] === view)
}

/** Freshness rows a footer should summarise for a view. */
export function sourcesFor(freshness: SourceFreshness[], view: AppView): SourceFreshness[] {
  if (view === 'home' || view === 'settings') return freshness
  return freshness.filter((item) => sourceOwner[item.source] === view)
}
