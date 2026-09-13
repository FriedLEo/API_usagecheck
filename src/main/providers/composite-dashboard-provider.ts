import type { UsageProvider } from './provider'
import type { DeepSeekProvider } from './deepseek/deepseek-provider'
import type { ZenQuotaService } from './opencode/zen-quota-service'
import type { DashboardSnapshot } from '../../shared/contracts/dashboard'
import type { ProviderManifest } from '../../shared/contracts/provider'

/**
 * Merges a secondary quota source into the dashboard snapshot.
 *
 * Quota windows are surfaced through the existing `DashboardSnapshot.quotaWindows`
 * field (previously always empty), so the renderer needs no additional IPC and it
 * gets live push updates for free. It also means every existing refresh path — the
 * Refresh button, the interval schedule, the tray item, and the powerMonitor resume
 * handler — updates the secondary source too, with no second scheduler and no torn
 * snapshot (both sources are awaited before the snapshot is returned).
 *
 * The window shows the current provider name in its titlebar, and `providerId` stays
 * 'deepseek', so read `quotaWindows` as "quota windows surfaced on this dashboard".
 */
export class CompositeDashboardProvider implements UsageProvider {
  readonly manifest: ProviderManifest

  constructor(private readonly base: DeepSeekProvider, private readonly quota: ZenQuotaService) {
    this.manifest = { ...base.manifest, capabilities: { ...base.manifest.capabilities, quotaWindows: true } }
  }

  async refresh(days: 7 | 30, signal?: AbortSignal): Promise<DashboardSnapshot> {
    const [snapshot] = await Promise.all([
      this.base.refresh(days, signal),
      // The quota service already swallows its own failures; this is belt-and-braces.
      this.quota.refresh(signal).catch(() => undefined)
    ])
    return this.merge(snapshot)
  }

  async snapshot(days: 7 | 30): Promise<DashboardSnapshot> {
    return this.merge(await this.base.snapshot(days))
  }

  private merge(snapshot: DashboardSnapshot): DashboardSnapshot {
    return {
      ...snapshot,
      quotaWindows: this.quota.quotaWindows(),
      freshness: [...snapshot.freshness, ...this.quota.freshness()]
    }
  }
}
