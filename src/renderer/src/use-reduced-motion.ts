import { useEffect, useState } from 'react'

const query = '(prefers-reduced-motion: reduce)'

/**
 * Recharts animates with its own requestAnimationFrame loop, so a CSS
 * `prefers-reduced-motion` rule cannot switch it off — the chart has to be told
 * explicitly. Everything else in the app honours the setting in CSS.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = (): void => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}
