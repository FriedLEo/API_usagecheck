import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyUsage } from '../../../shared/contracts/dashboard'
import { formatMoney, formatTokens } from '../format'
import { usePrefersReducedMotion } from '../use-reduced-motion'

/** Friendly tooltip names, matching the chart legend. */
const seriesLabels: Record<string, string> = { spend: 'Spend', hit: 'Cache hit', miss: 'Cache miss', output: 'Output' }

/** Provider defaults to CNY when a usage block omits its currency. */
const fallbackCurrency = 'CNY'

/**
 * Colours come from the CSS tokens, so the bars and the legend swatches cannot
 * drift apart. `fill` must stay on every `<Bar>`: the tooltip derives its colour
 * swatch from the prop.
 */
const axisTick = { fill: 'var(--text-3)', fontSize: 10 }
const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  boxShadow: 'var(--shadow-md)',
  color: 'var(--text)'
}

export function DailyUsageChart({ daily, mode }: { daily: DailyUsage[]; mode: 'tokens' | 'spend' }): React.JSX.Element {
  const reducedMotion = usePrefersReducedMotion()
  const animate = !reducedMotion
  const data = daily.map((day) => ({
    date: day.date.slice(5), hit: Number(day.tokens.inputCacheHit), miss: Number(day.tokens.inputCacheMiss),
    output: Number(day.tokens.output), spend: Number(day.costs[0]?.amount ?? 0),
    currency: day.costs[0]?.currency ?? fallbackCurrency
  }))
  if (!data.length) return <div className="empty-chart">Live history appears after connecting a Platform session.</div>

  const axisCurrency = data.find((day) => day.currency)?.currency ?? fallbackCurrency

  // Recharts passes loosely typed tooltip values, so accept `unknown` and narrow here.
  const formatTooltipValue = (value: unknown, name: unknown, item: unknown): [string, string] => {
    const label = seriesLabels[String(name)] ?? String(name)
    if (mode === 'spend') {
      const currency = (item as { payload?: { currency?: string } } | undefined)?.payload?.currency ?? axisCurrency
      return [formatMoney(value as number, currency), label]
    }
    return [formatTokens(value as number), label]
  }

  return (
    <div className="chart" aria-label={`Daily ${mode} chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -22 }}>
          <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(value: number) =>
              mode === 'spend'
                ? formatMoney(value, axisCurrency, { fractionDigits: 0 })
                : value > 999999 ? `${Math.round(value / 1000000)}M` : String(value)
            }
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--chart-cursor)' }} formatter={formatTooltipValue} />
          {mode === 'spend'
            ? <Bar dataKey="spend" fill="var(--chart-spend)" radius={[4, 4, 0, 0]} isAnimationActive={animate} />
            : <>
              <Bar dataKey="hit" stackId="tokens" fill="var(--chart-hit)" isAnimationActive={animate} />
              <Bar dataKey="miss" stackId="tokens" fill="var(--chart-miss)" isAnimationActive={animate} />
              <Bar dataKey="output" stackId="tokens" fill="var(--chart-output)" radius={[4, 4, 0, 0]} isAnimationActive={animate} />
            </>}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
