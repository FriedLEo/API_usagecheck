import { app, ipcMain } from 'electron'
import type { UsageProvider } from '../providers/provider'
import type { SafeStorageVault } from '../credentials/safe-storage-vault'
import type { AppStore } from '../storage/app-store'
import type { WindowController } from '../window/window-controller'
import type { GlobalShortcutService } from '../shortcuts/global-shortcut-service'
import type { SyncCoordinator } from '../services/sync-coordinator'
import { IPC } from '../../shared/contracts/ipc'
import { credentialInputSchema, credentialKindSchema, rangeDaysSchema, settingsPatchSchema, windowActionSchema } from '../../shared/validation/ipc-schemas'

export function registerIpc(deps: {
  provider: UsageProvider
  vault: SafeStorageVault
  store: AppStore
  window: WindowController
  shortcuts: GlobalShortcutService
  sync: SyncCoordinator
}): void {
  ipcMain.handle(IPC.bootstrap, () => ({ settings: deps.store.getSettings(), credentials: deps.vault.statuses() }))
  ipcMain.handle(IPC.dashboard, (_event, input) => deps.provider.snapshot(rangeDaysSchema.parse(input) ?? deps.store.getSettings().rangeDays))
  ipcMain.handle(IPC.refresh, () => deps.sync.refresh(deps.store.getSettings().rangeDays))
  ipcMain.handle(IPC.settings, (_event, input) => {
    const patch = settingsPatchSchema.parse(input)
    if (patch.hotkey) deps.shortcuts.register(patch.hotkey, () => void deps.window.toggle())
    const settings = deps.store.setSettings(patch)
    deps.window.setAutoHide(settings.autoHide); deps.window.setPinned(settings.pinned)
    app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin })
    deps.sync.schedule(settings.rangeDays, settings.usageRefreshMinutes)
    return settings
  })
  ipcMain.handle(IPC.credentialSave, async (_event, input) => {
    const value = credentialInputSchema.parse(input)
    return deps.vault.save(value.kind, value.secret, value.persist)
  })
  ipcMain.handle(IPC.credentialClear, (_event, input) => deps.vault.clear(credentialKindSchema.parse(input)))
  ipcMain.handle(IPC.windowAction, async (_event, input) => {
    const action = windowActionSchema.parse(input)
    if (action === 'HIDE') deps.window.hide()
    if (action === 'PIN') deps.window.setPinned(true)
    if (action === 'UNPIN') deps.window.setPinned(false)
    if (action === 'POINTER_ENTER') deps.window.pointerEnter()
    if (action === 'POINTER_LEAVE') deps.window.pointerLeave()
  })
}
