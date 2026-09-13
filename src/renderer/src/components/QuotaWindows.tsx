import type { SourceFreshness } from '../../../shared/contracts/dashboard'
import type { QuotaWindow } from '../../../shared/contracts/provider'
import { countdown } from '../format'
import { quotaReading } from '../stats'
import { useTick } from '../use-tick'
import { QuotaBar } from './QuotaBar'

export function QuotaWindows({ windows, configured, freshness }: {
  windows: QuotaWindow[]
  configured: boolean
  freshness: SourceFreshness | undefined
}): React.JSX.Element {
  useTick()

  return (
    <section className="usage-card">
      <header><div><b>OpenCode Zen Go</b><small>subscription quota · experimental</small></div></header>

      {!configured && <p className="quota-empty">Not connected — add an OpenCode Zen API key in Settings.</p>}
      {configured && windows.length === 0 && (
        <p className="quota-empty">{freshness?.error ? freshness.error.message : 'Waiting for the first reading…'}</p>
      )}

      {windows.length > 0 && (
        <div className="quota-list">
          {windows.map((entry) => (
            <div className="quota-row" key={entry.id}>
              <div className="quota-head"><span>{entry.label}</span><b>{quotaReading(entry).readout}</b></div>
              <QuotaBar entry={entry} />
              <div className="quota-foot">
                <span>{entry.resetsAt ? `resets in ${countdown(entry.resetsAt)}` : 'no reset time reported'}</span>
                {entry.status && entry.status !== 'ok' && <em className="quota-badge">{entry.status}</em>}
              </div>
            </div>
          ))}
        </div>
      )}

      {windows.length > 0 && (freshness?.error || !configured) && (
        <small className="quota-stale">
          {freshness?.error ? "Couldn't refresh — showing last known values." : 'Not connected — showing last known values.'}
        </small>
      )}
    </section>
  )
}
