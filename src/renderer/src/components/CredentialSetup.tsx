import { useState } from 'react'
import type { CredentialKind } from '../../../shared/contracts/provider'

export function CredentialSetup({ kind, title, help, configured, onSaved }: {
  kind: CredentialKind; title: string; help: string; configured: boolean; onSaved(): void
}): React.JSX.Element {
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async (): Promise<void> => {
    setBusy(true)
    try { await window.usageTracker.saveCredential(kind, secret, true); setSecret(''); onSaved() } finally { setBusy(false) }
  }
  return (
    <label className="credential-row">
      <span><b>{title}</b><small>{configured ? 'Connected securely' : help}</small></span>
      {!configured && <><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="Paste here" autoComplete="off" /><button disabled={busy || secret.length < 8} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button></>}
      {configured && <button className="connected" disabled>✓ Connected</button>}
    </label>
  )
}
