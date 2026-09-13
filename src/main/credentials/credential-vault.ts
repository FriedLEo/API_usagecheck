import type { CredentialKind, CredentialStatus } from '../../shared/contracts/provider'

export interface CredentialVault {
  initialize(): Promise<void>
  get(kind: CredentialKind): Promise<string | null>
  save(kind: CredentialKind, value: string, persist: boolean): Promise<CredentialStatus>
  clear(kind: CredentialKind): Promise<CredentialStatus>
  status(kind: CredentialKind): CredentialStatus
}
