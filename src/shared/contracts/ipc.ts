import type { DashboardSnapshot } from './dashboard'
import type { CredentialStatus, CredentialKind } from './provider'
import type { AppSettings } from './settings'

export interface BootstrapPayload {
  settings: AppSettings
  credentials: CredentialStatus[]
}

export interface TrackerApi {
  getBootstrap(): Promise<BootstrapPayload>
  getDashboard(rangeDays?: 7 | 30): Promise<DashboardSnapshot>
  refresh(): Promise<DashboardSnapshot>
  updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>
  saveCredential(kind: CredentialKind, secret: string, persist: boolean): Promise<CredentialStatus>
  clearCredential(kind: CredentialKind): Promise<CredentialStatus>
  windowAction(action: 'HIDE' | 'PIN' | 'UNPIN' | 'POINTER_ENTER' | 'POINTER_LEAVE'): Promise<void>
  onSnapshotUpdated(callback: () => void): () => void
}

export const IPC = {
  bootstrap: 'app:get-bootstrap',
  dashboard: 'dashboard:get',
  refresh: 'sync:refresh',
  settings: 'settings:update',
  credentialSave: 'credentials:save',
  credentialClear: 'credentials:clear',
  windowAction: 'window:action',
  snapshotUpdated: 'app:snapshot-updated'
} as const
