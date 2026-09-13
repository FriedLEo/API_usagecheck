import type { BrowserWindow } from 'electron'
import { shell } from 'electron'

const allowedExternalOrigins = new Set([
  'https://platform.deepseek.com',
  'https://api-docs.deepseek.com'
])

export function applyNavigationPolicy(window: BrowserWindow, rendererUrl: string): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      if (allowedExternalOrigins.has(parsed.origin)) void shell.openExternal(url)
    } catch {
      // Invalid URLs are denied.
    }
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (url !== rendererUrl) event.preventDefault()
  })
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  window.webContents.session.setPermissionCheckHandler(() => false)
}
