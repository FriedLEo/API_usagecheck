import type { SourceFreshness } from '../../../shared/contracts/dashboard'
import { sourceLabels } from '../providers'

/** Freshness errors rendered as rows that lead to Settings, where they can be fixed. */
export function AlertList({ alerts, onOpenSettings }: {
  alerts: SourceFreshness[]
  onOpenSettings(): void
}): React.JSX.Element {
  return (
    <>
      {alerts.map((item) => (
        <button key={item.source} className="source-alert" onClick={onOpenSettings}>
          <span>!</span>
          <div>
            <b>{sourceLabels[item.source]}: {item.error?.message}</b>
            <small>{item.lastSuccessAt ? 'Showing last-known data' : 'Open settings to connect'}</small>
          </div>
          ›
        </button>
      ))}
    </>
  )
}
