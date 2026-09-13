import type { ProviderTab } from '../providers'
import type { CardStat } from '../stats'
import { QuotaBar } from './QuotaBar'

/**
 * A clickable overview card. Real `<button>` so it is keyboard operable and
 * visible in High Contrast mode. All copy and bar data are derived by the
 * caller, keeping this presentational.
 */
export function ProviderCard({ tab, stat, onOpen }: {
  tab: ProviderTab
  stat: CardStat
  onOpen(): void
}): React.JSX.Element {
  return (
    <button
      className={stat.connected ? 'provider-card' : 'provider-card disconnected'}
      onClick={onOpen}
      aria-label={`${tab.name}: ${stat.headline}`}
    >
      <span className="provider-head">
        <span className="provider-name">{tab.name}</span>
        <span className="provider-sub">{tab.subtitle}</span>
      </span>
      {stat.kind === 'QUOTA' && <QuotaBar entry={stat.entry} />}
      <span className="provider-stat">
        <b>{stat.headline}</b>
        <small>{stat.secondary}</small>
      </span>
    </button>
  )
}
