import { globalShortcut } from 'electron'
import { TrackerError } from '../../shared/contracts/errors'

export class GlobalShortcutService {
  private accelerator: string | null = null

  register(accelerator: string, callback: () => void): void {
    const next = accelerator.trim()
    if (!next || !globalShortcut.register(next, callback)) {
      throw new TrackerError('HOTKEY_UNAVAILABLE', 'That shortcut is already used by Windows or another app.')
    }
    const previous = this.accelerator
    this.accelerator = next
    if (previous && previous !== next) globalShortcut.unregister(previous)
  }

  unregister(): void {
    if (this.accelerator) globalShortcut.unregister(this.accelerator)
    this.accelerator = null
  }
}
