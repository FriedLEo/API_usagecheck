import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, dialog, powerMonitor, screen, type Tray } from 'electron'
import { is } from '@electron-toolkit/utils'
import { applyNavigationPolicy } from './security/navigation-policy'
import { WindowController } from './window/window-controller'
import { GlobalShortcutService } from './shortcuts/global-shortcut-service'
import { createTray } from './tray/tray-service'
import { SafeStorageVault } from './credentials/safe-storage-vault'
import { AppStore } from './storage/app-store'
import { DeepSeekProvider } from './providers/deepseek/deepseek-provider'
import { ZenQuotaService } from './providers/opencode/zen-quota-service'
import { CompositeDashboardProvider } from './providers/composite-dashboard-provider'
import { SyncCoordinator } from './services/sync-coordinator'
import { registerIpc } from './ipc/register-ipc'
import { IPC } from '../shared/contracts/ipc'
import { logger } from './security/redacted-logger'

const hasSingleInstanceLock = app.requestSingleInstanceLock()

let controller: WindowController | null = null
let sync: SyncCoordinator | null = null
let shortcuts: GlobalShortcutService | null = null
let tray: Tray | null = null
let quitting = false

function createWindow(): BrowserWindow {
  const rendererUrl = is.dev && process.env['ELECTRON_RENDERER_URL']
    ? process.env['ELECTRON_RENDERER_URL']
    : pathToFileURL(path.join(__dirname, '../renderer/index.html')).href
  const window = new BrowserWindow({
    width: 430, height: 720, show: false, frame: false, transparent: true,
    alwaysOnTop: true, skipTaskbar: true, resizable: false, backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: true,
      nodeIntegration: false, webSecurity: true, devTools: is.dev
    }
  })
  applyNavigationPolicy(window, rendererUrl)
  window.on('close', (event) => { if (!quitting) { event.preventDefault(); controller?.hide() } })
  void window.loadURL(rendererUrl)
  return window
}

async function start(): Promise<void> {
  app.setAppUserModelId('com.apitrackdesktop.windows')
  const store = new AppStore()
  const vault = new SafeStorageVault(path.join(app.getPath('userData'), 'secure', 'credentials.v1.json'))
  await vault.initialize()
  const window = createWindow()
  controller = new WindowController(window)
  const provider = new CompositeDashboardProvider(new DeepSeekProvider(vault, store), new ZenQuotaService(vault, store))
  sync = new SyncCoordinator(provider, () => window.webContents.send(IPC.snapshotUpdated))
  shortcuts = new GlobalShortcutService()
  const settings = store.getSettings()
  controller.setAutoHide(settings.autoHide); controller.setPinned(settings.pinned)
  try { shortcuts.register(settings.hotkey, () => void controller?.toggle()) }
  catch (error) { logger.error('Could not register global shortcut', error) }
  registerIpc({ provider, vault, store, window: controller, shortcuts, sync })
  tray = createTray({
    show: () => void controller?.reveal(true), hide: () => controller?.hide(),
    refresh: () => { void sync?.refresh(store.getSettings().rangeDays) },
    quit: () => { quitting = true; app.quit() }
  })
  screen.on('display-removed', () => controller?.rehome())
  screen.on('display-metrics-changed', () => controller?.rehome())
  powerMonitor.on('resume', () => { controller?.rehome(); void sync?.refresh(store.getSettings().rangeDays) })
  sync.schedule(settings.rangeDays, settings.usageRefreshMinutes)
  await controller.reveal(true)
  void sync.refresh(settings.rangeDays)
}

// A failure here used to leave the process alive holding the single-instance
// lock with no window or tray, so every later double-click was silently
// swallowed. Surface the error and terminate instead of becoming a zombie.
function reportFatalStartupError(error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error)
  logger.error('Fatal startup error', error)
  try {
    dialog.showErrorBox('API track desktop could not start', `${detail}\n\nThe application will now close.`)
  } catch {
    // The dialog can be unavailable during very early startup failures.
  }
  quitting = true
  app.exit(1)
}

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => void controller?.reveal(true))
  app.on('window-all-closed', () => undefined)
  app.on('before-quit', () => {
    quitting = true
    sync?.stop()
    shortcuts?.unregister()
    tray?.destroy()
    tray = null
  })
  void app.whenReady().then(start).catch(reportFatalStartupError)
}
