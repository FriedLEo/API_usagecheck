import type { QuotaWindow } from '../../../shared/contracts/provider'
import { quotaReading, severity } from '../stats'

/**
 * The quota fill bar, shared by the Home card and the provider detail panel.
 *
 * The fill spans the full track and is revealed by a `clip-path` inset rather
 * than a width, so the browser never re-runs layout and the pill cap is
 * preserved by the inset's `round` radii. A base `clip-path` is declared in
 * CSS because a transition cannot start from `none`.
 *
 * Pass `entry={null}` for an unknown window (for example a provider that is not
 * connected): the inset clips the fill away entirely, leaving the empty track.
 * That is deliberately different from a 0% fill, which would claim "quota
 * unused" when the truth is "unknown".
 */
export function QuotaBar({ entry }: { entry: QuotaWindow | null }): React.JSX.Element {
  const reading = entry ? quotaReading(entry) : { measured: false, percent: 0, readout: 'no reading' }
  const label = entry?.label ?? 'Quota'
  const percent = reading.measured ? reading.percent : 0
  return (
    <div
      className={`quota-bar ${reading.measured ? severity(reading.percent) : 'unknown'}`}
      role="img"
      aria-label={reading.measured ? `${label} quota: ${reading.readout}` : `${label} quota: no reading`}
    >
      <span style={{ clipPath: `inset(0 ${100 - percent}% 0 0 round 0 4px 4px 0)` }} />
    </div>
  )
}
