import type { UsageProvider } from '../providers/provider'

export class SyncCoordinator {
  private active: Promise<unknown> | null = null
  private controller: AbortController | null = null
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly provider: UsageProvider, private readonly notify: () => void) {}

  refresh(days: 7 | 30): Promise<unknown> {
    if (this.active) return this.active
    this.controller = new AbortController()
    this.active = this.provider.refresh(days, this.controller.signal).finally(() => {
      this.active = null; this.controller = null; this.notify()
    })
    return this.active
  }

  schedule(days: 7 | 30, minutes: number): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => { void this.refresh(days) }, minutes * 60_000)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null; this.controller?.abort()
  }
}
