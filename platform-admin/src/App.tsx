import { useEffect, useState, type ReactElement } from 'react'
import { Button, ToastProvider } from './ui'
import {
  GBatches, GDashboard, GMovements, GPrices, GProducts, GQuality, GStock,
} from './gaanugu-screens'
import {
  GAdjustment, GBullPress, GGrn, GProcurement, GTransfer, GWarehouses,
} from './gaanugu-ops'
import {
  GAlerts, GAuditLog, GHoldRelease, GSettings,
} from './gaanugu-alerts'
import { GCounts } from './gaanugu-counts'
import { GReports } from './gaanugu-reports'
import { clearAuth, getAuth, navEvents, saveAuth, setUnauthorizedHandler, verifyCredentials } from './api'

type NavItem = { id: string; label: string; Component: () => ReactElement | null; title: ReactElement; sub: string }
type NavGroup = { section: string; icon: string; items: NavItem[] }

const N = (id: string, label: string, Component: NavItem['Component'], title: ReactElement, sub: string): NavItem =>
  ({ id, label, Component, title, sub })

const NAV: NavGroup[] = [
  {
    section: 'Dashboard', icon: '📊',
    items: [
      N('g-dashboard', 'Inventory Dashboard', GDashboard,
        <>Operations <em>dashboard</em></>,
        'Stock, batches, QC queue, expiry radar — the first screen of the day.'),
    ],
  },
  {
    section: 'Stock', icon: '📦',
    items: [
      N('g-stock', 'Stock Levels', GStock,
        <>Stock <em>levels</em></>,
        'On hand, reserved, on hold, available — per SKU, batch, warehouse.'),
    ],
  },
  {
    section: 'Production', icon: '🏭',
    items: [
      N('g-batches', 'Batches', GBatches,
        <><em>Production</em> batches</>,
        'Every pressing session, from seed to release gate.'),
      N('g-bullpress', 'Bull & Press', GBullPress,
        <>Bull &amp; <em>press</em> management</>,
        'Bulls, operators, work logs (4-hour welfare limit), press condition.'),
    ],
  },
  {
    section: 'Warehouses', icon: '🏢',
    items: [
      N('g-warehouses', 'Warehouses', GWarehouses,
        <><em>Warehouse</em> network</>,
        'Production unit, fulfilment hubs — with per-warehouse stock views.'),
    ],
  },
  {
    section: 'Movements', icon: '🔄',
    items: [
      N('g-movements', 'Transaction Ledger', GMovements,
        <>Movement <em>ledger</em></>,
        'Immutable audit trail of every unit in and out.'),
      N('g-transfer', 'Transfer Stock', GTransfer,
        <>Stock <em>transfer</em></>,
        'Move units between warehouses — writes paired ledger entries.'),
      N('g-adjustment', 'Stock Adjustment', GAdjustment,
        <>Stock <em>adjustment</em></>,
        'Correct system stock to physical count — damage, spoilage, expiry, theft.'),
      N('g-grn', 'Goods Receipt (GRN)', GGrn,
        <>Goods <em>receipt</em></>,
        'Record packaging deliveries against purchase orders.'),
    ],
  },
  {
    section: 'Procurement', icon: '🌾',
    items: [
      N('g-procurement', 'Procurement', GProcurement,
        <><em>Seed</em> &amp; packaging procurement</>,
        'Seed purchases from farmers, packaging POs, supplier directory.'),
    ],
  },
  {
    section: 'Quality', icon: '✅',
    items: [
      N('g-quality', 'QC Dashboard', GQuality,
        <>Quality <em>checks</em></>,
        'FSSAI panel — aflatoxin, temperature, pass/fail.'),
      N('g-holdrelease', 'Hold & Release', GHoldRelease,
        <>Stock hold &amp; <em>release</em></>,
        'Quarantine and release units at a stock position.'),
    ],
  },
  {
    section: 'Alerts', icon: '🔔',
    items: [
      N('g-alerts', 'Alerts', GAlerts,
        <>Active <em>alerts</em> &amp; rules</>,
        'Low stock, near expiry, QC overdue — materialised from threshold rules (ADR-0008).'),
    ],
  },
  {
    section: 'Counts', icon: '📋',
    items: [
      N('g-counts', 'Stock Counts', GCounts,
        <>Stock <em>counts</em></>,
        'Count plans, execution, and reconciliation to the ledger (ADR-0009).'),
    ],
  },
  {
    section: 'Reports', icon: '📈',
    items: [
      N('g-reports', 'Reports', GReports,
        <><em>Reports</em></>,
        'Analytics overview, standard reports, custom builder, schedules (ADR-0011).'),
    ],
  },
  {
    section: 'Catalog', icon: '🫙',
    items: [
      N('g-products', 'Oils', GProducts,
        <>Oil <em>catalog</em></>,
        'Cold-pressed oils and their SKU variants.'),
      N('g-prices', 'Prices', GPrices,
        <>Price <em>configurations</em></>,
        'MRP, selling and cost prices per SKU — history preserved (ADR-0007).'),
    ],
  },
  {
    section: 'Settings', icon: '⚙️',
    items: [
      N('g-settings', 'Settings', GSettings,
        <><em>Settings</em></>,
        'General, reorder rules, expiry policy, bull & press config, permissions.'),
    ],
  },
  {
    section: 'Audit', icon: '🔍',
    items: [
      N('g-audit', 'Audit Log', GAuditLog,
        <>Audit <em>log</em></>,
        'Who changed what — transfers, adjustments, counts, QC (ADR-0010). ADMIN-only.'),
    ],
  },
]

const FLAT: NavItem[] = NAV.flatMap((g) => g.items)

type NavId = (typeof FLAT)[number]['id']

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
        <input className="input" placeholder="Username" value={user} autoFocus aria-label="Username"
          onChange={(e) => setUser(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && pass && submit()} />
        <input className="input" placeholder="Password" type="password" value={pass} aria-label="Password"
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
  useEffect(() => {
    const handler = (e: Event) => setTab((e as CustomEvent<string>).detail as NavId)
    navEvents.addEventListener('nav', handler)
    return () => navEvents.removeEventListener('nav', handler)
  }, [])
  const active = FLAT.find((n) => n.id === tab)!
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">FELD·N·<em>STEIN</em></div>
        <div className="brand-sub">Platform Admin</div>
        <nav className="nav">
          {NAV.map((g) => (
            <div key={g.section}>
              <div className="nav-section">{g.icon} {g.section}</div>
              {g.items.map((n) => (
                <button key={n.id} className={n.id === tab ? 'active' : ''} onClick={() => setTab(n.id)}>
                  <span className="dot" />{n.label}
                </button>
              ))}
            </div>
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
