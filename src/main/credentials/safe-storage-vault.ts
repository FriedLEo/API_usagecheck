import { promises as fs } from 'node:fs'
import path from 'node:path'
import { safeStorage } from 'electron'
import type { CredentialKind, CredentialStatus } from '../../shared/contracts/provider'
import type { CredentialVault } from './credential-vault'
import { TrackerError } from '../../shared/contracts/errors'

interface CredentialFile {
  version: 1
  values: Partial<Record<CredentialKind, string>>
}

const kinds: CredentialKind[] = ['API_KEY', 'PLATFORM_TOKEN', 'ZEN_API_KEY']

export class SafeStorageVault implements CredentialVault {
  private readonly memory = new Map<CredentialKind, string>()
  private persisted: CredentialFile = { version: 1, values: {} }

  constructor(private readonly filePath: string) {}

  async initialize(): Promise<void> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8')) as CredentialFile
      if (parsed.version === 1 && parsed.values && typeof parsed.values === 'object') this.persisted = parsed
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        await fs.rename(this.filePath, `${this.filePath}.invalid`).catch(() => undefined)
      }
    }
  }

  async get(kind: CredentialKind): Promise<string | null> {
    const transient = this.memory.get(kind)
    if (transient) return transient
    const encrypted = this.persisted.values[kind]
    if (!encrypted || !safeStorage.isEncryptionAvailable()) return null
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    } catch {
      throw new TrackerError('STORAGE_UNAVAILABLE', 'The saved credential could not be decrypted.')
    }
  }

  async save(kind: CredentialKind, value: string, persist: boolean): Promise<CredentialStatus> {
    const secret = value.trim()
    if (!secret) throw new TrackerError('VALIDATION_FAILED', 'Credential cannot be empty.')
    if (!persist) {
      this.memory.set(kind, secret)
      return this.status(kind)
    }
    if (!safeStorage.isEncryptionAvailable()) {
      throw new TrackerError('STORAGE_UNAVAILABLE', 'Windows-protected encryption is currently unavailable.')
    }
    this.persisted.values[kind] = safeStorage.encryptString(secret).toString('base64')
    this.memory.delete(kind)
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    const temporary = `${this.filePath}.tmp`
    await fs.writeFile(temporary, JSON.stringify(this.persisted), { encoding: 'utf8', mode: 0o600 })
    await fs.rename(temporary, this.filePath)
    return this.status(kind)
  }

  async clear(kind: CredentialKind): Promise<CredentialStatus> {
    this.memory.delete(kind)
    delete this.persisted.values[kind]
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    await fs.writeFile(this.filePath, JSON.stringify(this.persisted), { encoding: 'utf8', mode: 0o600 })
    return this.status(kind)
  }

  status(kind: CredentialKind): CredentialStatus {
    if (this.memory.has(kind)) return { kind, state: 'SESSION_ONLY' }
    if (this.persisted.values[kind]) return { kind, state: 'CONFIGURED' }
    return { kind, state: 'NOT_CONFIGURED' }
  }

  statuses(): CredentialStatus[] {
    return kinds.map((kind) => this.status(kind))
  }
}
