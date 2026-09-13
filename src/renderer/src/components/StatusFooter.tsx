import type { SourceFreshness } from '../../../shared/contracts/dashboard'

/** Freshness summary for whatever set of sources the current view owns. */
export function StatusFooter({ sources }: { sources: SourceFreshness[] }): React.JSX.Element {
  const stale = sources.some((item) => item.isStale)
  return (
    <footer>
      <span className={stale ? 'stale-dot' : 'live-dot'} /> {stale ? 'Some data is stale' : 'Live data up to date'}
      <span>Ctrl + Alt + U</span>
    </footer>
  )
}
