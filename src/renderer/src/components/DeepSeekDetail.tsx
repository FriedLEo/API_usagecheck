import { useState } from 'react'
import Decimal from 'decimal.js'
import type { DashboardSnapshot } from '../../../shared/contracts/dashboard'
import { formatMoney, formatTokens } from '../format'
import { alertsFor, sourcesFor, type NavDirection } from '../providers'
import { AlertList } from './AlertList'
import { DailyUsageChart } from './DailyUsageChart'
import { PricingBanner } from './PricingBanner'
import { StatusFooter } from './StatusFooter'

function money(values: Array<{ amount: string; currency: string }>): string {
  if (!values.length) return '—'
  return values.map((value) => formatMoney(value.amount, value.currency)).join(' · ')
}

/** Full DeepSeek detail. Unchanged content, moved off the overview. */
export function DeepSeekDetail({ snapshot, rangeDays, nav, onOpenSettings }: {
  snapshot: DashboardSnapshot
  rangeDays: number
  nav: NavDirection
  onOpenSettings(): void
}): React.JSX.Element {
  const [chartMode, setChartMode] = useState<'tokens' | 'spend'>('tokens')
  const tokens = snapshot.selectedRange.tokens
  const total = new Decimal(tokens.inputCacheHit).plus(tokens.inputCacheMiss).plus(tokens.output).toNumber()

  return (
    <div className="dashboard view" data-nav={nav}>
      <PricingBanner pricing={snapshot.pricing} />

      <section className="kpis">
        <article><small>Remaining balance</small><strong>{money(snapshot.balance)}</strong><span>{snapshot.balance.length ? `Paid ${money(snapshot.balance.map((v) => ({ amount: v.toppedUp, currency: v.currency })))}` : 'Connect API key'}</span></article>
        <article><small>{snapshot.cumulativeLabel}</small><strong>{money(snapshot.cumulativeSpend)}</strong><span>Cumulative spend</span></article>
        <article><small>Last {rangeDays} days</small><strong>{money(snapshot.selectedRange.spend)}</strong><span>Spend</span></article>
        <article><small>Last {rangeDays} days</small><strong>{formatTokens(total)}</strong><span>Tokens</span></article>
      </section>

      <AlertList alerts={alertsFor(snapshot.freshness, 'deepseek')} onOpenSettings={onOpenSettings} />

      <section className="usage-card">
        <header><div><b>Daily activity</b><small>{snapshot.coverage.start ? `${snapshot.coverage.start} – ${snapshot.coverage.end}` : 'Waiting for live data'}</small></div><div className="segmented"><button className={chartMode === 'tokens' ? 'active' : ''} onClick={() => setChartMode('tokens')}>Tokens</button><button className={chartMode === 'spend' ? 'active' : ''} onClick={() => setChartMode('spend')}>Spend</button></div></header>
        <DailyUsageChart daily={snapshot.daily} mode={chartMode} />
        <div className="legend"><span className="hit">Cache hit</span><span className="miss">Cache miss</span><span className="output">Output</span></div>
      </section>

      <StatusFooter sources={sourcesFor(snapshot.freshness, 'deepseek')} />
    </div>
  )
}
