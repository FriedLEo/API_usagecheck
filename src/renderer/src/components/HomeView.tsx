import { localDateKey } from '../../../shared/dates'
import type { DashboardSnapshot } from '../../../shared/contracts/dashboard'
import type { BootstrapPayload } from '../../../shared/contracts/ipc'
import { alertsFor, isConnected, providerTabs, type NavDirection, type ProviderView } from '../providers'
import { headlineQuotaWindow, payAsYouGoCard, quotaCard, todayUsage } from '../stats'
import { useTick } from '../use-tick'
import { AlertList } from './AlertList'
import { ProviderCard } from './ProviderCard'
import { StatusFooter } from './StatusFooter'

/** Neutral overview: one card per provider, plus Settings and any global alerts. */
export function HomeView({ snapshot, bootstrap, nav, onOpen, onOpenSettings }: {
  snapshot: DashboardSnapshot
  bootstrap: BootstrapPayload
  nav: NavDirection
  onOpen(view: ProviderView): void
  onOpenSettings(): void
}): React.JSX.Element {
  // Ticks so the countdowns stay live and "today" rolls over at local midnight.
  useTick()

  const usage = todayUsage(snapshot.daily, localDateKey(new Date()))
  const quotaEntry = headlineQuotaWindow(snapshot.quotaWindows)
  const quotaError = snapshot.freshness.find((item) => item.source === 'ZEN_GO_API')?.error ?? null

  return (
    <div className="dashboard view" data-nav={nav}>
      <section className="provider-list">
        {providerTabs.map((tab) => (
          <ProviderCard
            key={tab.id}
            tab={tab}
            stat={tab.kind === 'PAY_AS_YOU_GO'
              ? payAsYouGoCard({
                connected: isConnected(bootstrap.credentials, tab.primaryCredential),
                usage,
                hasHistory: snapshot.daily.length > 0
              })
              : quotaCard({
                connected: isConnected(bootstrap.credentials, tab.primaryCredential),
                entry: quotaEntry,
                errorMessage: quotaError?.message ?? null
              })}
            onOpen={() => onOpen(tab.id)}
          />
        ))}
      </section>

      <button className="settings-entry" onClick={onOpenSettings}>
        <span>Connections &amp; settings</span>
        <span aria-hidden="true">⚙</span>
      </button>

      <AlertList alerts={alertsFor(snapshot.freshness, 'home')} onOpenSettings={onOpenSettings} />
      <StatusFooter sources={snapshot.freshness} />
    </div>
  )
}
