import type { UsageProvider } from './provider'

export class ProviderRegistry {
  private readonly providers = new Map<string, UsageProvider>()

  register(provider: UsageProvider): void {
    if (this.providers.has(provider.manifest.id)) throw new Error(`Provider already registered: ${provider.manifest.id}`)
    this.providers.set(provider.manifest.id, provider)
  }

  get(id: string): UsageProvider {
    const provider = this.providers.get(id)
    if (!provider) throw new Error(`Unknown provider: ${id}`)
    return provider
  }

  manifests() {
    return [...this.providers.values()].map((provider) => provider.manifest)
  }
}
