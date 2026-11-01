import { useState, useEffect, useCallback } from 'react'
import { DataTable, ErrorState, Kpi, LoadingRows, Pill } from '../ui'
import { formatINR, formatPct } from '../api/formats'
import { type DashboardSummary, gaanugu, BATCH_STATUSES, batchStatusTone } from '../api/types'
import { PanelTitle } from '../screens/shared'

export function AnalyticsScreen() {
  const [dash, setDash] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trace, setTrace] = useState<Record<string, unknown>[] | null>(null)
  const [traceError, setTraceError] = useState(false)
  const load = useCallback(() => {
    setError(null); setTraceError(false)
    gaanugu.dashboard().then(setDash).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
    gaanugu.traceability().then(setTrace).catch(() => setTraceError(true))
  }, [])
  useEffect(load, [load])

  if (error) return <div className="card"><ErrorState message={error} onRetry={load} /></div>
  if (!dash) return <div className="card"><LoadingRows cols={4} /></div>
  const maxStatus = Math.max(...BATCH_STATUSES.map((s) => dash.batchesByStatus[s] ?? 0), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="kpi-grid">
        <Kpi dark label="Stock asset value" value={formatINR(dash.stockValue)} />
        <Kpi label="Yield to date (L)" value={dash.totalYieldLitres} />
        <Kpi label="Procurement paid" value={formatINR(dash.procurementPaid)} />
        <Kpi label="Procurement pending" value={formatINR(dash.procurementPending)} />
        <Kpi label="QC pass rate" value={formatPct(dash.qcPassRate)} />
        <Kpi label="Reserved units" value={dash.reservedUnits} />
      </div>

      <div className="card">
        <PanelTitle>Batches by status</PanelTitle>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BATCH_STATUSES.map((s) => {
            const n = dash.batchesByStatus[s] ?? 0
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 130, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{s.replace('_', ' ')}</span>
                <div style={{ flex: 1, height: 14, background: 'var(--cream)', borderRadius: 7 }}>
                  <div style={{ width: `${(n / maxStatus) * 100}%`, height: '100%', borderRadius: 7, background: 'var(--primary)', minWidth: n ? 14 : 0 }} />
                </div>
                <strong style={{ width: 30, textAlign: 'right' }}>{n}</strong>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <PanelTitle>Traceability — farmer → bull → press → batch</PanelTitle>
        {traceError ? (
          <p style={{ padding: 16, color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>
            Couldn’t load traceability — <button className="linklike" onClick={load}>retry</button>
          </p>
        ) : !trace ? <LoadingRows cols={5} /> : (
          <DataTable columns={[
            { key: 'batchCode', label: 'Batch' },
            { key: 'product', label: 'Oil' },
            { key: 'farmer', label: 'Farmer' },
            { key: 'bull', label: 'Bull' },
            { key: 'operator', label: 'Operator' },
            { key: 'press', label: 'Press' },
            { key: 'oilYieldLitres', label: 'Yield (L)', numeric: true },
            { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Pill tone={batchStatusTone(String(r.status))}>{String(r.status).replace('_', ' ')}</Pill> },
          ] as never} rows={trace as never[]} />
        )}
      </div>
    </div>
  )
}
