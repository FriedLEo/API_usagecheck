import { useCallback, useEffect, useState } from 'react'
import type { BootstrapPayload } from '../../shared/contracts/ipc'
import type { DashboardSnapshot } from '../../shared/contracts/dashboard'
import { CredentialSetup } from './components/CredentialSetup'
import { DeepSeekDetail } from './components/DeepSeekDetail'
import { HomeView } from './components/HomeView'
import { QuotaWindows } from './components/QuotaWindows'
import { StatusFooter } from './components/StatusFooter'
import { AlertList } from './components/AlertList'
import { alertsFor, isConnected, sourcesFor, viewTitle, type AppView, type NavDirection, type ProviderView } from './providers'

export function App(): React.JSX.Element {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null)
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [view, setView] = useState<AppView>('home')
  // Remembered so the gear from a provider detail returns there, not always Home.
  const [settingsReturnTo, setSettingsReturnTo] = useState<Exclude<AppView, 'settings'>>('home')
  // 'none' on first paint: the window itself is already sliding in, and two
  // simultaneous motions read as a stutter.
  const [nav, setNav] = useState<NavDirection>('none')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [nextBootstrap, nextSnapshot] = await Promise.all([window.usageTracker.getBootstrap(), window.usageTracker.getDashboard()])
    setBootstrap(nextBootstrap); setSnapshot(nextSnapshot)
  }, [])

  useEffect(() => {
    void load()
    return window.usageTracker.onSnapshotUpdated(() => void load())
  }, [load])

  useEffect(() => {
    const enter = (): void => { void window.usageTracker.windowAction('POINTER_ENTER') }
    const leave = (): void => { void window.usageTracker.windowAction('POINTER_LEAVE') }
    document.addEventListener('mouseenter', enter); document.addEventListener('mouseleave', leave)
    return () => { document.removeEventListener('mouseenter', enter); document.removeEventListener('mouseleave', leave) }
  }, [])

  const refresh = async (): Promise<void> => {
    setBusy(true)
    try { setSnapshot(await window.usageTracker.refresh()) } finally { setBusy(false) }
  }

  if (!bootstrap || !snapshot) return <main className="loading-shell"><div className="brand-mark">DS</div><h1>DeepSeek Usage Tracker</h1><p>Preparing your overview…</p></main>

  const openProvider = (next: ProviderView): void => { setNav('forward'); setView(next) }
  const openSettings = (): void => {
    setSettingsReturnTo(view === 'settings' ? settingsReturnTo : view)
    setNav('forward')
    setView('settings')
  }
  const goBack = (): void => { setNav('back'); setView(view === 'settings' ? settingsReturnTo : 'home') }

  const hasApi = isConnected(bootstrap.credentials, 'API_KEY')
  const hasToken = isConnected(bootstrap.credentials, 'PLATFORM_TOKEN')
  const hasZen = isConnected(bootstrap.credentials, 'ZEN_API_KEY')

  return (
    <main className="app-shell">
      <header className="titlebar">
        <div className="product">
          {view !== 'home' && <button className="back" title="Back" onClick={goBack}>←</button>}
          <div><b>{viewTitle(view)}</b><small>Usage Tracker</small></div>
        </div>
        <nav>
          <button title="Refresh" onClick={() => void refresh()} disabled={busy}>{busy ? '···' : '↻'}</button>
          <button title="Settings" onClick={() => (view === 'settings' ? goBack() : openSettings())}>{view === 'settings' ? '←' : '⚙'}</button>
          <button title="Hide" onClick={() => void window.usageTracker.windowAction('HIDE')}>—</button>
        </nav>
      </header>

      {view === 'home' && (
        <HomeView snapshot={snapshot} bootstrap={bootstrap} nav={nav} onOpen={openProvider} onOpenSettings={openSettings} />
      )}

      {view === 'deepseek' && (
        <DeepSeekDetail snapshot={snapshot} rangeDays={bootstrap.settings.rangeDays} nav={nav} onOpenSettings={openSettings} />
      )}

      {view === 'zen' && (
        <div className="dashboard view" data-nav={nav}>
          <AlertList alerts={alertsFor(snapshot.freshness, 'zen')} onOpenSettings={openSettings} />
          <QuotaWindows
            windows={snapshot.quotaWindows}
            configured={hasZen}
            freshness={snapshot.freshness.find((item) => item.source === 'ZEN_GO_API')}
          />
          <StatusFooter sources={sourcesFor(snapshot.freshness, 'zen')} />
        </div>
      )}

      {view === 'settings' && (
        <section className="settings-panel view" data-nav={nav}>
          <h2>Connections & settings</h2>
          <p className="notice">Two credentials are needed because DeepSeek exposes balance and dashboard history through separate interfaces. An OpenCode Zen key is optional and adds Go subscription quota.</p>
          <CredentialSetup kind="API_KEY" title="DeepSeek API key" help="Official live balance" configured={hasApi} onSaved={() => void load()} />
          <CredentialSetup kind="PLATFORM_TOKEN" title="Platform userToken" help="Live spend and token history" configured={hasToken} onSaved={() => void load()} />
          <CredentialSetup kind="ZEN_API_KEY" title="OpenCode Zen API key" help="Go subscription quota (experimental)" configured={hasZen} onSaved={() => void load()} />
          <details className="guide"><summary>How to copy your Platform userToken</summary><ol><li>Sign in at platform.deepseek.com.</li><li>Press F12 and open Application → Local Storage.</li><li>Select platform.deepseek.com and copy the value named <code>userToken</code>.</li><li>Paste it above. Never share it with anyone.</li></ol><p>This private dashboard interface is experimental and may require reconnecting after DeepSeek changes or session expiry.</p></details>
          <label className="toggle-row">Auto-hide at screen edge<input type="checkbox" checked={bootstrap.settings.autoHide} onChange={async (event) => { await window.usageTracker.updateSettings({ autoHide: event.target.checked }); void load() }} /></label>
          <label className="toggle-row">Launch when Windows starts<input type="checkbox" checked={bootstrap.settings.launchAtLogin} onChange={async (event) => { await window.usageTracker.updateSettings({ launchAtLogin: event.target.checked }); void load() }} /></label>
          <label className="field-row"><span>Global shortcut</span><input value={bootstrap.settings.hotkey.replace('CommandOrControl', 'Ctrl')} onChange={() => undefined} readOnly /><small>Ctrl+Alt+U</small></label>
          <button className="primary" onClick={() => { setView(settingsReturnTo); void refresh() }}>Save & refresh</button>
        </section>
      )}
    </main>
  )
}
