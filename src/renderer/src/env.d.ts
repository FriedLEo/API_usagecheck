import type { TrackerApi } from '../../shared/contracts/ipc'

declare global {
  interface Window {
    usageTracker: TrackerApi
  }
}

export {}
