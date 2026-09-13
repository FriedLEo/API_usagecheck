import ElectronStore from 'electron-store'
import type { DailyUsage } from '../../shared/contracts/dashboard'
import type { ProviderBalance, QuotaSnapshot } from '../../shared/contracts/provider'
import { defaultSettings, type AppSettings } from '../../shared/contracts/settings'
import { settingsPatchSchema } from '../../shared/validation/ipc-schemas'

interface StoreSchema {
  settings: AppSettings
  balance: ProviderBalance | null
  usage: { daily: DailyUsage[]; fetchedAt: string; coverage: { start: string; end: string } } | null
  zenQuota: QuotaSnapshot | null
}

type ElectronStoreConstructor = typeof ElectronStore

// `electron-store` v11 is ESM-only, but electron-vite bundles the main process
// as CommonJS. There, `require('electron-store')` returns the module namespace
// object rather than the class, so `new Store(...)` fails with "Store is not a
// constructor". Unwrap the namespace when present; fall back to the direct
// value so this also works if the bundle ever switches to real ESM interop.
const Store: ElectronStoreConstructor = (
  (ElectronStore as unknown as { default?: ElectronStoreConstructor }).default ?? ElectronStore
)

export class AppStore {
  private readonly store = new Store<StoreSchema>({
    name: 'tracker-data',
    defaults: { settings: defaultSettings, balance: null, usage: null, zenQuota: null }
  })

  getSettings(): AppSettings {
    return { ...defaultSettings, ...this.store.get('settings') }
  }

  setSettings(patch: unknown): AppSettings {
    const validPatch = settingsPatchSchema.parse(patch)
    const current = this.getSettings()
    const next: AppSettings = {
      hotkey: validPatch.hotkey ?? current.hotkey,
      autoHide: validPatch.autoHide ?? current.autoHide,
      pinned: validPatch.pinned ?? current.pinned,
      launchAtLogin: validPatch.launchAtLogin ?? current.launchAtLogin,
      theme: validPatch.theme ?? current.theme,
      selectedModel: validPatch.selectedModel ?? current.selectedModel,
      rangeDays: validPatch.rangeDays ?? current.rangeDays,
      balanceRefreshMinutes: validPatch.balanceRefreshMinutes ?? current.balanceRefreshMinutes,
      usageRefreshMinutes: validPatch.usageRefreshMinutes ?? current.usageRefreshMinutes
    }
    this.store.set('settings', next)
    return next
  }

  getBalance(): ProviderBalance | null { return this.store.get('balance') }
  setBalance(balance: ProviderBalance): void { this.store.set('balance', balance) }
  getUsage(): StoreSchema['usage'] { return this.store.get('usage') }
  setUsage(usage: NonNullable<StoreSchema['usage']>): void { this.store.set('usage', usage) }
  getZenQuota(): QuotaSnapshot | null { return this.store.get('zenQuota') }
  setZenQuota(quota: QuotaSnapshot): void { this.store.set('zenQuota', quota) }
}
