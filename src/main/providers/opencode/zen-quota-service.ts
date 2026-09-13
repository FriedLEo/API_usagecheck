import type { CredentialVault } from '../../credentials/credential-vault'
import type { QuotaSnapshot, QuotaWindow } from '../../../shared/contracts/provider'
import type { SourceFreshness } from '../../../shared/contracts/dashboard'
import { TrackerError } from '../../../shared/contracts/errors'
import { fetchZenQuota } from './zen-usage-client'

/**
 * Narrow persistence seam. Keeping this structural (rather than depending on
 * `AppStore`) means this module's import graph pulls in no Electron at runtime,
 * so the service can be unit-tested in a plain Node environment.
 */
export interface ZenQuotaStore {
  getZenQuota(): QuotaSnapshot | null
  setZenQuota(value: QuotaSnapshot): void
}

export class ZenQuotaService {
  private readonly row: SourceFreshness = {
    source: 'ZEN_GO_API', lastAttemptAt: null, lastSuccessAt: null, isStale: true, error: null
  }
  private configured = false

  constructor(private readonly vault: CredentialVault, private readonly store: ZenQuotaStore) {}

  /** Never throws: failures are recorded on the freshness row. */
  async refresh(signal?: AbortSignal): Promise<void> {
    this.row.lastAttemptAt = new Date().toISOString()

    let apiKey: string | null
    try {
      apiKey = await this.vault.get('ZEN_API_KEY')
    } catch (error) {
      // A stored credential exists but could not be read, so surface the problem.
      this.configured = true
      this.applyError(error)
      return
    }

    if (!apiKey) {
      // Stay silent until the user opts in. Emitting a freshness row here would
      // give every existing DeepSeek-only install a permanent warning banner.
      this.configured = false
      return
    }

    this.configured = true
    try {
      const snapshot = await fetchZenQuota(apiKey, signal)
      this.store.setZenQuota(snapshot)
      this.row.lastSuccessAt = snapshot.fetchedAt
      this.row.isStale = false
      this.row.error = null
    } catch (error) {
      this.applyError(error)
    }
  }

  /** Last known windows, retained across failures. */
  quotaWindows(): QuotaWindow[] {
    return this.store.getZenQuota()?.windows ?? []
  }

  /** No row until a key is configured or a previous read succeeded. */
  freshness(): SourceFreshness[] {
    return this.configured || this.row.lastSuccessAt !== null ? [this.row] : []
  }

  private applyError(error: unknown): void {
    const known = error instanceof TrackerError ? error : new TrackerError('UNKNOWN', 'Unexpected OpenCode Zen error.')
    this.row.error = { code: known.code, message: known.message, retryable: known.retryable }
    // Stale means "we still have data to show, but the latest read failed". That
    // includes windows restored from a previous session, not just this process's
    // reads — otherwise a restart plus a failed refresh would report fresh data
    // while the panel is showing values from the store.
    this.row.isStale = this.store.getZenQuota() !== null
  }
}
