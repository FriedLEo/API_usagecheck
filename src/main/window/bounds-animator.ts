import type { BrowserWindow, Rectangle } from 'electron'

export class BoundsAnimator {
  private timer: NodeJS.Timeout | null = null

  animate(window: BrowserWindow, target: Rectangle, duration = 190): Promise<void> {
    this.cancel()
    const start = window.getBounds()
    const started = performance.now()
    return new Promise((resolve) => {
      const step = (): void => {
        const progress = Math.min(1, (performance.now() - started) / duration)
        const eased = 1 - Math.pow(1 - progress, 3)
        window.setBounds({
          x: Math.round(start.x + (target.x - start.x) * eased),
          y: Math.round(start.y + (target.y - start.y) * eased),
          width: Math.round(start.width + (target.width - start.width) * eased),
          height: Math.round(start.height + (target.height - start.height) * eased)
        })
        if (progress >= 1) { this.timer = null; resolve(); return }
        this.timer = setTimeout(step, 16)
      }
      step()
    })
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }
}
