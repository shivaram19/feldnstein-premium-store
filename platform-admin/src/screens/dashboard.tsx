import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, DataTable, EmptyState, ErrorState, Kpi, LoadingRows, Pill } from '../ui'
import { navigate } from '../api/client'
import { formatINR, formatPct } from '../api/formats'
import { type ProductionBatch, type StockLevel, type DashboardSummary, gaanugu, BATCH_STATUSES, batchStatusTone } from '../api/types'
import { useList, availableUnits } from '../api/list'
import { PanelTitle } from '../screens/shared'

/* ================= DASHBOARD ================= */
export function DashboardScreen() {
  const [dash, setDash] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stock = useList<StockLevel>('/stock-levels?size=500')
  const batches = useList<ProductionBatch>('/production-batches?size=500')
  const load = useCallback(() => {
    setError(null)
    gaanugu.dashboard().then(setDash).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])
  useEffect(load, [load])

  const low = useMemo(() => stock.data?.filter((s) => availableUnits(s) < 10) ?? [], [stock.data])
  const expiring = useMemo(
    () => stock.data?.filter((s) => s.expiryDate && new Date(s.expiryDate) <= new Date(Date.now() + 30 * 864e5)) ?? [],
    [stock.data])
  const qcQueue = useMemo(() => batches.data?.filter((b) => b.status === 'QC_PENDING') ?? [], [batches.data])

  // live feel: refresh the whole dashboard every 30s while it is open
  useEffect(() => {
    const t = setInterval(() => { load(); stock.reload(); batches.reload() }, 30000)
    return () => clearInterval(t)
  }, [load, stock, batches])

  if (error) return <div className="card"><ErrorState message={error} onRetry={load} /></div>
  if (!dash) return <div className="card"><LoadingRows cols={4} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="kpi-grid">
        <Kpi dark label="Stock value" value={formatINR(dash.stockValue)} />
        <Kpi label="Units on hand" value={dash.stockUnits.toLocaleString('en-IN')} />
        <Kpi label="Available to sell" value={dash.availableUnits.toLocaleString('en-IN')} />
        <Kpi label="Active batches" value={dash.activeBatches} />
        <Kpi label="Today's pressings" value={dash.todaysPressings} />
        <Kpi label="Total yield (L)" value={dash.totalYieldLitres} />
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        <div className={`kpi${dash.lowStockCount ? '' : ''}`} style={dash.lowStockCount ? { borderColor: 'var(--rust)' } : undefined}>
          <div className="kpi-label">⚠ Low stock SKUs</div>
          <div className="kpi-value" style={dash.lowStockCount ? { color: 'var(--rust)' } : undefined}>{dash.lowStockCount}</div>
        </div>
        <div className="kpi" style={dash.expiringSoonCount ? { borderColor: 'var(--gold)' } : undefined}>
          <div className="kpi-label">◷ Expiring ≤ 30 days</div>
          <div className="kpi-value" style={dash.expiringSoonCount ? { color: 'var(--gold-deep)' } : undefined}>{dash.expiringSoonCount}</div>
        </div>
        <div className="kpi" style={dash.qcPendingCount ? { borderColor: 'var(--gold)' } : undefined}>
          <div className="kpi-label">✓ QC pending queue</div>
          <div className="kpi-value">{dash.qcPendingCount}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">QC pass rate</div>
          <div className="kpi-value">{formatPct(dash.qcPassRate)}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Production pipeline
        </div>
        <div style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BATCH_STATUSES.map((s) => (
            <Pill key={s} tone={batchStatusTone(s)}>{s.replace('_', ' ')} · {dash.batchesByStatus[s] ?? 0}</Pill>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 22 }}>
        <div className="card">
          <PanelTitle action={<Button variant="ghost" small onClick={() => navigate('g-stock')}>View all →</Button>}>Low stock — reorder now</PanelTitle>
          {stock.loading ? <LoadingRows cols={3} /> : low.length === 0
            ? <EmptyState title="Nothing low." hint="All SKUs hold 10+ available units." />
            : <DataTable columns={[
                { key: 'sku', label: 'SKU', render: (s: StockLevel) => s.variant?.sku },
                { key: 'wh', label: 'Warehouse', render: (s: StockLevel) => s.warehouse?.name },
                { key: 'avail', label: 'Available', numeric: true, render: (s: StockLevel) => <Pill tone="rust">{availableUnits(s)}</Pill> },
              ] as never} rows={low as never[]} />}
        </div>
        <div className="card">
          <PanelTitle action={<Button variant="ghost" small onClick={() => navigate('g-stock')}>View all →</Button>}>Expiring within 30 days</PanelTitle>
          {stock.loading ? <LoadingRows cols={3} /> : expiring.length === 0
            ? <EmptyState title="Nothing expiring soon." />
            : <DataTable columns={[
                { key: 'sku', label: 'SKU', render: (s: StockLevel) => s.variant?.sku },
                { key: 'batch', label: 'Batch', render: (s: StockLevel) => s.batch?.code },
                { key: 'exp', label: 'Expires', render: (s: StockLevel) => <Pill tone="gold">{s.expiryDate}</Pill> },
              ] as never} rows={expiring as never[]} />}
        </div>
        <div className="card">
          <PanelTitle action={<Button variant="ghost" small onClick={() => navigate('g-batches')}>View all →</Button>}>QC queue</PanelTitle>
          {batches.loading ? <LoadingRows cols={3} /> : qcQueue.length === 0
            ? <EmptyState title="QC queue is clear." />
            : <DataTable columns={[
                { key: 'code', label: 'Batch', render: (b: ProductionBatch) => b.batchCode },
                { key: 'product', label: 'Product', render: (b: ProductionBatch) => b.product?.name },
                { key: 'yield', label: 'Yield (L)', numeric: true, render: (b: ProductionBatch) => b.oilYieldLitres ?? '—' },
              ] as never} rows={qcQueue as never[]} />}
        </div>
      </div>
    </div>
  )
}

