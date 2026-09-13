import { useEffect, useState } from 'react'

/**
 * Re-renders on an interval so reset countdowns and the local day boundary stay
 * current between syncs.
 */
export function useTick(ms = 30_000): void {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}
