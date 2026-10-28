import { useEffect, useState } from 'react'
import { Button, ToastProvider } from './ui'
import {
  AnalyticsTab, LoyaltyTab, OrdersTab, PointsLedgerTab, ProductsTab, StockMovementsTab,
} from './tabs'
import { clearAuth, getAuth, saveAuth, setUnauthorizedHandler, verifyCredentials } from './api'

const NAV = [
  { id: 'products', label: 'Products', icon: '🫙', Component: ProductsTab, title: <>The <em>catalog</em></>, sub: 'Inventory items, stock levels, and low-stock alerts.' },
  { id: 'stock-movements', label: 'Stock Movements', icon: '⇄', Component: StockMovementsTab, title: <>Stock <em>ledger</em></>, sub: 'Every unit in, out, and adjusted — the traceability trail.' },
  { id: 'purchase-orders', label: 'Orders', icon: '🧾', Component: OrdersTab, title: <><em>Orders</em></>, sub: 'Order book with live status pipeline.' },
  { id: 'loyalty-accounts', label: 'Loyalty', icon: '❋', Component: LoyaltyTab, title: <>Loyalty <em>members</em></>, sub: 'Tiers and points balances across the membership.' },
  { id: 'loyalty-transactions', label: 'Points Ledger', icon: '✦', Component: PointsLedgerTab, title: <>Points <em>ledger</em></>, sub: 'Awards and redemptions, post by post.' },
  { id: 'analytics', label: 'Analytics', icon: '◔', Component: AnalyticsTab, title: <><em>Analytics</em></>, sub: 'Business summary across every domain.' },
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
  const [tab, setTab] = useState<NavId>('products')
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
