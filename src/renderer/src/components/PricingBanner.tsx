import { useEffect, useState } from 'react'
import type { PricingPeriodSnapshot } from '../../../shared/contracts/dashboard'
import { countdown } from '../format'

export function PricingBanner({ pricing }: { pricing: PricingPeriodSnapshot }): React.JSX.Element {
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((value) => value + 1), 30_000); return () => clearInterval(id) }, [])
  return (
    <section className={`pricing ${pricing.kind.toLowerCase()}`}>
      <div><span className="status-dot" /> <strong>{pricing.kind.replace('_', '-')} NOW</strong></div>
      <p>{pricing.nextKind.replace('_', '-').toLowerCase()} in {countdown(pricing.nextTransitionAt)} · {new Date(pricing.nextTransitionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      <div className="rate-grid">
        <span>Cache hit<b>${pricing.current.cacheHitInput}</b></span>
        <span>Cache miss<b>${pricing.current.cacheMissInput}</b></span>
        <span>Output<b>${pricing.current.output}</b></span>
      </div>
      <small>per 1M tokens · {pricing.model}</small>
    </section>
  )
}
