import type { UsageProvider } from '../provider'
import type { ProviderManifest } from '../../../shared/contracts/provider'
import type { CredentialVault } from '../../credentials/credential-vault'
import type { AppStore } from '../../storage/app-store'
import type { SourceFreshness } from '../../../shared/contracts/dashboard'
import { TrackerError } from '../../../shared/contracts/errors'
import { fetchOfficialBalance } from './official-balance-client'
import { fetchPrivateUsage } from './private-usage-client'
import { aggregateDashboard } from '../../services/aggregation-service'

export class DeepSeekProvider implements UsageProvider {
  readonly manifest: ProviderManifest = {
    id: 'deepseek', displayName: 'DeepSeek', accountUrl: 'https://platform.deepseek.com/usage',
    pricingUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
    capabilities: { balance: true, monetaryUsage: true, tokenUsage: true, pricingPeriods: true, quotaWindows: false }
  }
  private freshness: SourceFreshness[] = [
    { source: 'OFFICIAL_BALANCE_API', lastAttemptAt: null, lastSuccessAt: null, isStale: true, error: null },
    { source: 'EXPERIMENTAL_PRIVATE_API', lastAttemptAt: null, lastSuccessAt: null, isStale: true, error: null }
  ]

  constructor(private readonly vault: CredentialVault, private readonly store: AppStore) {}

  async refresh(days: 7 | 30, signal?: AbortSignal) {
    await Promise.allSettled([this.refreshBalance(signal), this.refreshUsage(days, signal)])
    return this.snapshot(days)
  }

  async snapshot(days: 7 | 30) {
    const settings = this.store.getSettings()
    const usage = this.store.getUsage()
    return aggregateDashboard({
      balance: this.store.getBalance(), daily: usage?.daily ?? [], coverage: usage?.coverage ?? null,
      rangeDays: days, model: settings.selectedModel, freshness: this.freshness
    })
  }

  private async refreshBalance(signal?: AbortSignal): Promise<void> {
    const row = this.freshness[0]!
    row.lastAttemptAt = new Date().toISOString()
    const key = await this.vault.get('API_KEY')
    if (!key) { row.error = { code: 'NOT_CONFIGURED', message: 'Add a DeepSeek API key for live balance.', retryable: false }; return }
    try {
      const balance = await fetchOfficialBalance(key, signal)
      this.store.setBalance(balance); row.lastSuccessAt = balance.fetchedAt; row.isStale = false; row.error = null
    } catch (error) { this.applyError(row, error) }
  }

  private async refreshUsage(days: 7 | 30, signal?: AbortSignal): Promise<void> {
    const row = this.freshness[1]!
    row.lastAttemptAt = new Date().toISOString()
    const token = await this.vault.get('PLATFORM_TOKEN')
    if (!token) { row.error = { code: 'NOT_CONFIGURED', message: 'Add a Platform userToken for live usage.', retryable: false }; return }
    try {
      const usage = await fetchPrivateUsage(token, days, signal)
      this.store.setUsage(usage); row.lastSuccessAt = usage.fetchedAt; row.isStale = false; row.error = null
    } catch (error) { this.applyError(row, error) }
  }

  private applyError(row: SourceFreshness, error: unknown): void {
    const known = error instanceof TrackerError ? error : new TrackerError('UNKNOWN', 'Unexpected provider error.')
    row.error = { code: known.code, message: known.message, retryable: known.retryable }
    row.isStale = row.lastSuccessAt !== null
  }
}
