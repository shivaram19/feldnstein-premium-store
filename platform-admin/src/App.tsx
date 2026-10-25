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

export default function App() {
  const [tab, setTab] = useState<TabId>('products')
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null)
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const active = TABS.find((t) => t.id === tab)!

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setRows(null)
    setSummary(null)
    fetch(active.path)
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
  }, [active.path])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1>Feldnstein Platform Admin</h1>
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
