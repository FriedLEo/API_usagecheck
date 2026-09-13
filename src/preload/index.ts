import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/contracts/ipc'
import type { TrackerApi } from '../shared/contracts/ipc'

const api: TrackerApi = {
  getBootstrap(): ReturnType<TrackerApi['getBootstrap']> {
    return ipcRenderer.invoke(IPC.bootstrap)
  },
  getDashboard(rangeDays?: 7 | 30): ReturnType<TrackerApi['getDashboard']> {
    return ipcRenderer.invoke(IPC.dashboard, rangeDays)
  },
  refresh(): ReturnType<TrackerApi['refresh']> {
    return ipcRenderer.invoke(IPC.refresh)
  },
  updateSettings(patch): ReturnType<TrackerApi['updateSettings']> {
    return ipcRenderer.invoke(IPC.settings, patch)
  },
  saveCredential(kind, secret, persist): ReturnType<TrackerApi['saveCredential']> {
    return ipcRenderer.invoke(IPC.credentialSave, { kind, secret, persist })
  },
  clearCredential(kind): ReturnType<TrackerApi['clearCredential']> {
    return ipcRenderer.invoke(IPC.credentialClear, kind)
  },
  windowAction(action): ReturnType<TrackerApi['windowAction']> {
    return ipcRenderer.invoke(IPC.windowAction, action)
  },
  onSnapshotUpdated(callback): ReturnType<TrackerApi['onSnapshotUpdated']> {
    const listener = (): void => callback()
    ipcRenderer.on(IPC.snapshotUpdated, listener)
    return () => ipcRenderer.removeListener(IPC.snapshotUpdated, listener)
  }
}

Object.freeze(api)

contextBridge.exposeInMainWorld('usageTracker', api)
