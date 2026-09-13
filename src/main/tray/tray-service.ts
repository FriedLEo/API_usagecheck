import { Menu, nativeImage, Tray } from 'electron'

export interface TrayActions {
  show(): void
  hide(): void
  refresh(): void
  quit(): void
}

// Electron's nativeImage cannot decode SVG, so the previous SVG data URL
// produced an empty image and the tray icon rendered blank. This is an
// embedded 32x32 PNG (blue rounded square with a white bar-chart glyph).
const trayIconPng = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAkUlEQVR42u2XwQnAIAxFM5LTZACPmdAVHMZzjpYWKWJrD0X8rSTwr75HzCEhaopFPYsGFk0smgcllTc99YpFHYvGgdBedoa7g6cJ8LojrhaIE+FnJ+o/z6B4KsOBEgg0+e8vs0BA+JE1BdoygTUFniAmsI7AW4gJmIAJ/E4AvpLBl1LsWg4/TD5xmsGPU+R5vgEc2Skm4dEC0QAAAABJRU5ErkJggg=='

export function createTray(actions: TrayActions): Tray {
  const image = nativeImage.createFromDataURL(`data:image/png;base64,${trayIconPng}`)
  const tray = new Tray(image.resize({ width: 16, height: 16 }))
  tray.setToolTip('DeepSeek Usage Tracker')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show tracker', click: actions.show },
    { label: 'Hide tracker', click: actions.hide },
    { label: 'Refresh now', click: actions.refresh },
    { type: 'separator' },
    { label: 'Quit', click: actions.quit }
  ]))
  tray.on('click', actions.show)
  return tray
}
