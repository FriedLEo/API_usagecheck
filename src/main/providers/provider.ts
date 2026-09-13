import type { DashboardSnapshot } from '../../shared/contracts/dashboard'
import type { ProviderManifest } from '../../shared/contracts/provider'

export interface UsageProvider {
  readonly manifest: ProviderManifest
  refresh(days: 7 | 30, signal?: AbortSignal): Promise<DashboardSnapshot>
  snapshot(days: 7 | 30): Promise<DashboardSnapshot>
}
