import type { BrowserWindow } from 'electron'
import { BoundsAnimator } from './bounds-animator'
import { activeDisplay, peekBounds, revealedBounds } from './display-resolver'

export type DockState = 'HIDDEN' | 'EDGE_PEEK' | 'REVEALED'

export class WindowController {
  private state: DockState = 'HIDDEN'
  private pinned = false
  private autoHide = true
  private hideTimer: NodeJS.Timeout | null = null
  private readonly animator = new BoundsAnimator()

  constructor(private readonly window: BrowserWindow) {}

  async toggle(): Promise<void> {
    if (this.state === 'HIDDEN') await this.reveal(true)
    else this.hide()
  }

  async reveal(focus = false): Promise<void> {
    this.clearHideTimer()
    const display = activeDisplay(this.window.isVisible() ? this.window.getBounds() : undefined)
    this.window.setBounds(peekBounds(display))
    this.window.showInactive()
    await this.animator.animate(this.window, revealedBounds(display, this.window.getBounds().y))
    this.state = 'REVEALED'
    if (focus) this.window.focus()
  }

  hide(): void {
    this.clearHideTimer(); this.animator.cancel(); this.window.hide(); this.state = 'HIDDEN'
  }

  async peek(): Promise<void> {
    if (!this.autoHide || this.pinned || this.state === 'HIDDEN') return
    const display = activeDisplay(this.window.getBounds())
    await this.animator.animate(this.window, peekBounds(display, this.window.getBounds().y))
    this.state = 'EDGE_PEEK'
  }

  pointerEnter(): void {
    this.clearHideTimer()
    if (this.state === 'EDGE_PEEK') void this.reveal(false)
  }

  pointerLeave(): void {
    if (!this.autoHide || this.pinned || this.state !== 'REVEALED') return
    this.clearHideTimer()
    this.hideTimer = setTimeout(() => void this.peek(), 650)
  }

  setPinned(value: boolean): void { this.pinned = value; if (value) void this.reveal(false) }
  setAutoHide(value: boolean): void { this.autoHide = value }
  isVisible(): boolean { return this.state !== 'HIDDEN' }

  rehome(): void {
    if (this.state === 'HIDDEN') return
    const display = activeDisplay(this.window.getBounds())
    this.window.setBounds(this.state === 'EDGE_PEEK' ? peekBounds(display) : revealedBounds(display))
  }

  private clearHideTimer(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer)
    this.hideTimer = null
  }
}
