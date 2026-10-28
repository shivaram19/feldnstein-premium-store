import { useEffect, useState } from 'react'
import { Button, ToastProvider } from './ui'
import {
  AnalyticsTab, LoyaltyTab, OrdersTab, PointsLedgerTab, ProductsTab, StockMovementsTab,
} from './tabs'
import {
  GAnalytics, GBatches, GDashboard, GMasters, GMovements, GProducts, GQuality, GStock,
} from './gaanugu-screens'
import { clearAuth, getAuth, saveAuth, setUnauthorizedHandler, verifyCredentials } from './api'

const NAV = [
  { id: 'g-dashboard', label: 'Gaanugu · Dashboard', icon: '◈', Component: GDashboard, title: <>Operations <em>dashboard</em></>, sub: 'Stock, batches, QC queue, expiry radar — the first screen of the day.' },
  { id: 'g-batches', label: 'Production · Batches', icon: '⚙', Component: GBatches, title: <><em>Production</em> batches</>, sub: 'Every pressing session, from seed to release gate.' },
  { id: 'g-quality', label: 'Quality · Checks', icon: '✓', Component: GQuality, title: <>Quality <em>checks</em></>, sub: 'FSSAI panel — aflatoxin, temperature, pass/fail.' },
  { id: 'g-stock', label: 'Inventory · Stock', icon: '▤', Component: GStock, title: <>Stock <em>levels</em></>, sub: 'On hand, reserved, available — per SKU, batch, warehouse.' },
  { id: 'g-movements', label: 'Inventory · Ledger', icon: '⇄', Component: GMovements, title: <>Movement <em>ledger</em></>, sub: 'Immutable audit trail of every unit in and out.' },
  { id: 'g-products', label: 'Master · Oils', icon: '🫙', Component: GProducts, title: <>Oil <em>catalog</em></>, sub: 'Cold-pressed oils and their SKU variants.' },
  { id: 'g-masters', label: 'Master · Directory', icon: '☷', Component: GMasters, title: <>Master <em>directory</em></>, sub: 'Warehouses, farmers & suppliers, bulls, operators, presses.' },
  { id: 'g-analytics', label: 'Gaanugu · Analytics', icon: '◔', Component: GAnalytics, title: <><em>Analytics</em></>, sub: 'Stock value, yields, procurement spend, traceability.' },
  { id: 'products', label: 'Demo · Products', icon: '🫙', Component: ProductsTab, title: <>The <em>catalog</em></>, sub: 'Demo domain (ADR-0004) — replaced by gaanugu pages.' },
  { id: 'stock-movements', label: 'Demo · Movements', icon: '⇄', Component: StockMovementsTab, title: <>Stock <em>ledger</em></>, sub: 'Demo domain (ADR-0004).' },
  { id: 'purchase-orders', label: 'Demo · Orders', icon: '🧾', Component: OrdersTab, title: <><em>Orders</em></>, sub: 'Demo domain (ADR-0004).' },
  { id: 'loyalty-accounts', label: 'Demo · Loyalty', icon: '❋', Component: LoyaltyTab, title: <>Loyalty <em>members</em></>, sub: 'Demo domain (ADR-0004).' },
  { id: 'loyalty-transactions', label: 'Demo · Points', icon: '✦', Component: PointsLedgerTab, title: <>Points <em>ledger</em></>, sub: 'Demo domain (ADR-0004).' },
  { id: 'analytics', label: 'Demo · Analytics', icon: '◔', Component: AnalyticsTab, title: <><em>Analytics</em></>, sub: 'Demo domain (ADR-0004).' },
] as const

type NavId = (typeof NAV)[number]['id']

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => !!getAuth())
  useEffect(() => setUnauthorizedHandler(() => setAuthed(false)), [])
  return (
    <ToastProvider>
      {authed ? (
        <Shell onLogout={() => { clearAuth(); setAuthed(false) }} />
      ) : (
        <Login onSuccess={() => setAuthed(true)} />
      )}
    </ToastProvider>
  )
}

/* ---------- login ---------- */
function Login({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      saveAuth(user, pass)
      await verifyCredentials()
      onSuccess()
    } catch {
      clearAuth()
      setError('Sign-in failed. Check the username and password.')
      setBusy(false)
    }
  }
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">FELD·N·STEIN</div>
        <div className="brand-sub">Platform Admin · RBAC</div>
        <input className="input" placeholder="Username" value={user} autoFocus
          onChange={(e) => setUser(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && pass && submit()} />
        <input className="input" placeholder="Password" type="password" value={pass}
          onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && user && submit()} />
        <Button variant="primary" disabled={!user || !pass || busy} onClick={submit}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        {error && <p className="login-error">{error}</p>}
        <div className="login-hint">
          Demo accounts — <code>admin / admin123</code> <code>ops / ops123</code> <code>cust / cust123</code>
        </div>
      </div>
    </div>
  )
}

/* ---------- shell ---------- */
function Shell({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<NavId>('g-dashboard')
  const active = NAV.find((n) => n.id === tab)!
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">FELD·N·<em>STEIN</em></div>
        <div className="brand-sub">Platform Admin</div>
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.id} className={n.id === tab ? 'active' : ''} onClick={() => setTab(n.id)}>
              <span className="dot" />{n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>Signed in via HTTP Basic — demo realm (ADR-0005).</span>
          <Button variant="ghost-light" small onClick={onLogout}>Sign out</Button>
        </div>
      </aside>
      <main className="content">
        <h1 className="page-title">{active.title}</h1>
        <p className="page-sub">{active.sub}</p>
        <active.Component />
      </main>
    </div>
  )
}
