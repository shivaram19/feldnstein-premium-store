import { useEffect, useState } from 'react'

const TABS = [
  { id: 'products', label: 'Products', path: '/products' },
  { id: 'stock-movements', label: 'Stock Movements', path: '/stock-movements' },
  { id: 'purchase-orders', label: 'Orders', path: '/purchase-orders' },
  { id: 'loyalty-accounts', label: 'Loyalty', path: '/loyalty-accounts' },
  { id: 'loyalty-transactions', label: 'Points Ledger', path: '/loyalty-transactions' },
  { id: 'analytics', label: 'Analytics', path: '/analytics/summary' },
] as const

type TabId = (typeof TABS)[number]['id']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return <p>No rows.</p>
  const columns = Object.keys(data[0])
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} style={cellStyle}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c} style={cellStyle}>{formatValue(row[c])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AnalyticsView({ data }: { data: Record<string, unknown> }) {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {Object.entries(data).map(([k, v]) => (
          <tr key={k}>
            <th style={{ ...cellStyle, textAlign: 'left' }}>{k}</th>
            <td style={cellStyle}>{formatValue(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const cellStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '6px 10px',
  textAlign: 'left',
  fontSize: 14,
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #999',
  borderRadius: 6,
  fontSize: 14,
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid #999',
  cursor: 'pointer',
  background: '#222',
  color: '#fff',
}

export default function App() {
  const [tab, setTab] = useState<TabId>('products')
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null)
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [auth, setAuth] = useState<string | null>(null)

  const active = TABS.find((t) => t.id === tab)!

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setRows(null)
    setSummary(null)
    fetch(active.path, auth ? { headers: { Authorization: auth } } : undefined)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return res.json()
      })
      .then((json: unknown) => {
        if (cancelled) return
        if (Array.isArray(json)) {
          setRows(json.filter(isRecord))
        } else if (isRecord(json)) {
          setSummary(json)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [active.path, auth])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1>Feldnstein Platform Admin</h1>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <strong>Sign in (RBAC demo — ADR-0005):</strong>
        <input placeholder="user" value={user} onChange={(e) => setUser(e.target.value)} style={inputStyle} />
        <input placeholder="password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} style={inputStyle} />
        <button
          onClick={() => setAuth('Basic ' + btoa(`${user}:${pass}`))}
          style={buttonStyle}
          disabled={!user || !pass}
        >
          Login
        </button>
        {auth && (
          <button onClick={() => { setAuth(null); setUser(''); setPass('') }} style={buttonStyle}>
            Logout
          </button>
        )}
        <span style={{ fontSize: 12, color: '#666' }}>
          admin/admin123 (ADMIN) · ops/ops123 (OPERATOR) · cust/cust123 (CUSTOMER, read-only storefront role — expect 403 here)
        </span>
      </div>
      <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #999',
              cursor: 'pointer',
              background: t.id === tab ? '#222' : '#fff',
              color: t.id === tab ? '#fff' : '#222',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>Error fetching {active.path}: {error} (is the backend running on :8080?)</p>}
      {!loading && !error && rows && <DataTable data={rows} />}
      {!loading && !error && summary && <AnalyticsView data={summary} />}
    </div>
  )
}
