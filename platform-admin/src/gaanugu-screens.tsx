import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDate, formatINR } from './api'
import {
  batchStatusTone, BATCH_STATUSES, gaanugu,
  type GBull, type GBatch, type GDashboard, type GMovement, type GOperator, type GPress,
  type GPriceConfig, type GQualityCheck, type GStockLevel, type GSupplier, type GVariant, type GWarehouse,
} from './gaanugu-api'
import {
  Button, DataTable, EmptyState, ErrorState, Field, Kpi, LoadingRows, Modal, Pill,
  useToast, type Column,
} from './ui'

function useList<T>(path: string) {
  const [data, setData] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    let cancelled = false
    setLoading(true); setError(null)
    gaanugu.list<T>(path)
      .then((rows) => !cancelled && setData(rows))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [path])
  useEffect(() => reload(), [reload])
  return { data, error, loading, reload }
}

function View({ loading, error, rows, cols, empty, rowClass, onRetry }: {
  loading: boolean; error: string | null; rows: unknown[] | null
  cols: Column<never>[]; empty: string
  rowClass?: (row: never) => string | undefined; onRetry: () => void
}) {
  if (loading) return <LoadingRows cols={cols.length} />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (!rows || rows.length === 0) return <EmptyState title={empty} />
  return <DataTable columns={cols} rows={rows as never[]} rowClass={rowClass} />
}

const available = (s: GStockLevel) => s.onHand - s.reserved

/* ================= DASHBOARD ================= */
export function GDashboard() {
  const [dash, setDash] = useState<GDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stock = useList<GStockLevel>('/stock-levels')
  const batches = useList<GBatch>('/production-batches')
  const load = useCallback(() => {
    setError(null)
    gaanugu.dashboard().then(setDash).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])
  useEffect(load, [load])

  const low = useMemo(() => stock.data?.filter((s) => available(s) < 10) ?? [], [stock.data])
  const expiring = useMemo(
    () => stock.data?.filter((s) => s.expiryDate && new Date(s.expiryDate) <= new Date(Date.now() + 30 * 864e5)) ?? [],
    [stock.data])
  const qcQueue = useMemo(() => batches.data?.filter((b) => b.status === 'QC_PENDING') ?? [], [batches.data])

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
          <div className="kpi-value">{dash.qcPassRate === null ? '—' : `${dash.qcPassRate}%`}</div>
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
          <PanelTitle>Low stock — reorder now</PanelTitle>
          {stock.loading ? <LoadingRows cols={3} /> : low.length === 0
            ? <EmptyState title="Nothing low." hint="All SKUs hold 10+ available units." />
            : <DataTable columns={[
                { key: 'sku', label: 'SKU', render: (s: GStockLevel) => s.variant?.sku },
                { key: 'wh', label: 'Warehouse', render: (s: GStockLevel) => s.warehouse?.name },
                { key: 'avail', label: 'Available', numeric: true, render: (s: GStockLevel) => <Pill tone="rust">{available(s)}</Pill> },
              ] as never} rows={low as never[]} />}
        </div>
        <div className="card">
          <PanelTitle>Expiring within 30 days</PanelTitle>
          {stock.loading ? <LoadingRows cols={3} /> : expiring.length === 0
            ? <EmptyState title="Nothing expiring soon." />
            : <DataTable columns={[
                { key: 'sku', label: 'SKU', render: (s: GStockLevel) => s.variant?.sku },
                { key: 'batch', label: 'Batch', render: (s: GStockLevel) => s.batch?.code },
                { key: 'exp', label: 'Expires', render: (s: GStockLevel) => <Pill tone="gold">{s.expiryDate}</Pill> },
              ] as never} rows={expiring as never[]} />}
        </div>
        <div className="card">
          <PanelTitle>QC queue</PanelTitle>
          {batches.loading ? <LoadingRows cols={3} /> : qcQueue.length === 0
            ? <EmptyState title="QC queue is clear." />
            : <DataTable columns={[
                { key: 'code', label: 'Batch', render: (b: GBatch) => b.batchCode },
                { key: 'product', label: 'Product', render: (b: GBatch) => b.product?.name },
                { key: 'yield', label: 'Yield (L)', numeric: true, render: (b: GBatch) => b.oilYieldLitres ?? '—' },
              ] as never} rows={qcQueue as never[]} />}
        </div>
      </div>
    </div>
  )
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
      {children}
    </div>
  )
}

/* ================= PRODUCTS ================= */
export function GProducts() {
  const { data, error, loading, reload } = useList<GOilProductRef>('/oil-products')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  return (
    <section>
      <div className="toolbar">
        <Pill tone="forest">{data?.length ?? 0} oils</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ New oil</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={data as never[] | null} empty="No oils defined yet." onRetry={reload}
          cols={[
            { key: 'code', label: 'Code', render: (p: GOilProductRef) => <Pill tone="forest">{p.code}</Pill> },
            { key: 'name', label: 'Oil' },
            { key: 'source', label: 'Source', render: (p: GOilProductRef) => <Pill tone="plain">{p.oilSource}</Pill> },
            { key: 'shelf', label: 'Shelf life', render: (p: GOilProductRef) => `${p.shelfLifeDays} days` },
            { key: 'variants', label: 'SKUs', render: (p: GOilProductRef) => p.variants?.length ?? 0 },
          ] as never} />
      </div>
      <NewOilModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Oil created'); reload() }} />
    </section>
  )
}
type GOilProductRef = import('./gaanugu-api').GOilProduct

function NewOilModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ code: '', name: '', oilSource: 'GROUNDNUT', shelfLifeDays: '365' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = form.code.trim() && form.name.trim() && Number(form.shelfLifeDays) > 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/oil-products', { code: form.code.trim(), name: form.name.trim(), oilSource: form.oilSource, shelfLifeDays: Number(form.shelfLifeDays), active: true })
      setForm({ code: '', name: '', oilSource: 'GROUNDNUT', shelfLifeDays: '365' })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="New oil" sub="Master record — variants (SKUs) are added under it." open={open} onClose={onClose}>
      <Field label="Code"><input className="input" style={{ width: '100%' }} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="OIL-GN" autoFocus /></Field>
      <Field label="Name"><input className="input" style={{ width: '100%' }} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Cold-Pressed Groundnut Oil" /></Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Source">
          <select className="input" style={{ width: '100%' }} value={form.oilSource} onChange={(e) => setForm((f) => ({ ...f, oilSource: e.target.value }))}>
            {['GROUNDNUT', 'SESAME', 'COCONUT', 'MUSTARD', 'SUNFLOWER', 'OTHER'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Shelf life (days)"><input className="input" type="number" min="1" style={{ width: '100%' }} value={form.shelfLifeDays} onChange={(e) => setForm((f) => ({ ...f, shelfLifeDays: e.target.value }))} /></Field>
      </div>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Create oil'}</Button>
      </div>
    </Modal>
  )
}

/* ================= BATCHES ================= */
export function GBatches() {
  const { data, error, loading, reload } = useList<GBatch>('/production-batches')
  const [filter, setFilter] = useState<string>('ALL')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const filtered = useMemo(() => !data ? null : filter === 'ALL' ? data : data.filter((b) => b.status === filter), [data, filter])
  const count = (s: string) => data?.filter((b) => b.status === s).length ?? 0
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          <Pill tone={filter === 'ALL' ? 'forest' : 'plain'} selected={filter === 'ALL'} onClick={() => setFilter('ALL')}>All · {data?.length ?? 0}</Pill>
          {BATCH_STATUSES.map((s) => (
            <Pill key={s} tone={batchStatusTone(s)} selected={filter === s} onClick={() => setFilter(s)}>{s.replace('_', ' ')} · {count(s)}</Pill>
          ))}
        </div>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Record pressing</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={filtered as never[] | null}
          empty={filter === 'ALL' ? 'No batches yet.' : `No ${filter.replace('_', ' ').toLowerCase()} batches.`} onRetry={reload}
          cols={[
            { key: 'batchCode', label: 'Batch' },
            { key: 'product', label: 'Oil', render: (b: GBatch) => b.product?.name },
            { key: 'pressDate', label: 'Pressed', render: (b: GBatch) => b.pressDate },
            { key: 'status', label: 'Status', render: (b: GBatch) => <Pill tone={batchStatusTone(b.status)}>{b.status.replace('_', ' ')}</Pill> },
            { key: 'yield', label: 'Yield (L)', numeric: true, render: (b: GBatch) => b.oilYieldLitres ?? '—' },
            { key: 'bull', label: 'Bull', render: (b: GBatch) => b.bull?.name },
            { key: 'operator', label: 'Operator', render: (b: GBatch) => b.operator?.name },
            { key: 'bestBefore', label: 'Best before', render: (b: GBatch) => b.bestBeforeDate ?? '—' },
          ] as never} />
      </div>
      <BatchModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Batch recorded'); reload() }} />
    </section>
  )
}

function BatchModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [products, setProducts] = useState<GOilProductRef[]>([])
  const [farmers, setFarmers] = useState<GSupplier[]>([])
  const [bulls, setBulls] = useState<GBull[]>([])
  const [operators, setOperators] = useState<GOperator[]>([])
  const [presses, setPresses] = useState<GPress[]>([])
  const [form, setForm] = useState({ batchCode: '', productId: '', pressDate: '', seedType: '', seedQtyKg: '', seedCostTotal: '', farmerId: '', bullId: '', operatorId: '', pressId: '', weatherNotes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    gaanugu.list<GOilProductRef>('/oil-products').then(setProducts).catch(() => undefined)
    gaanugu.list<GSupplier>('/suppliers').then((r) => setFarmers(r.filter((s) => s.type === 'FARMER'))).catch(() => undefined)
    gaanugu.list<GBull>('/bulls').then(setBulls).catch(() => undefined)
    gaanugu.list<GOperator>('/press-operators').then(setOperators).catch(() => undefined)
    gaanugu.list<GPress>('/presses').then(setPresses).catch(() => undefined)
  }, [open])
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const valid = form.batchCode.trim() && form.productId && form.pressDate && Number(form.seedQtyKg) > 0 && Number(form.seedCostTotal) >= 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/production-batches', {
        batchCode: form.batchCode.trim(), product: { id: Number(form.productId) }, pressDate: form.pressDate,
        seedType: form.seedType.trim() || '—', seedQtyKg: Number(form.seedQtyKg), seedCostTotal: Number(form.seedCostTotal),
        farmer: form.farmerId ? { id: Number(form.farmerId) } : null,
        bull: form.bullId ? { id: Number(form.bullId) } : null,
        operator: form.operatorId ? { id: Number(form.operatorId) } : null,
        press: form.pressId ? { id: Number(form.pressId) } : null,
        status: 'PRESSING', weatherNotes: form.weatherNotes.trim() || null,
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Record pressing session" sub="The traceability root — every bottle traces back to this record." open={open} onClose={onClose}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Batch code"><input className="input" style={{ width: '100%' }} value={form.batchCode} onChange={set('batchCode')} placeholder="B-2026-104" autoFocus /></Field>
        <Field label="Press date"><input className="input" type="date" style={{ width: '100%' }} value={form.pressDate} onChange={set('pressDate')} /></Field>
      </div>
      <Field label="Oil">
        <select className="input" style={{ width: '100%' }} value={form.productId} onChange={set('productId')}>
          <option value="">Select oil…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Seed type / lot"><input className="input" style={{ width: '100%' }} value={form.seedType} onChange={set('seedType')} placeholder="Groundnut (Java)" /></Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Seed qty (kg)"><input className="input" type="number" min="0" style={{ width: '100%' }} value={form.seedQtyKg} onChange={set('seedQtyKg')} /></Field>
        <Field label="Seed cost (₹)"><input className="input" type="number" min="0" style={{ width: '100%' }} value={form.seedCostTotal} onChange={set('seedCostTotal')} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Farmer">
          <select className="input" value={form.farmerId} onChange={set('farmerId')}>
            <option value="">—</option>
            {farmers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Bull">
          <select className="input" value={form.bullId} onChange={set('bullId')}>
            <option value="">—</option>
            {bulls.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Operator">
          <select className="input" value={form.operatorId} onChange={set('operatorId')}>
            <option value="">—</option>
            {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
        <Field label="Press">
          <select className="input" value={form.pressId} onChange={set('pressId')}>
            <option value="">—</option>
            {presses.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Weather notes"><input className="input" style={{ width: '100%' }} value={form.weatherNotes} onChange={set('weatherNotes')} placeholder="Humidity, rain, temperature…" /></Field>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Record batch'}</Button>
      </div>
    </Modal>
  )
}

/* ================= QUALITY ================= */
export function GQuality() {
  const { data, error, loading, reload } = useList<GQualityCheck>('/quality-checks')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  return (
    <section>
      <div className="toolbar">
        <Pill tone="forest">{data?.filter((c) => c.overallPass).length ?? 0} passed</Pill>
        <Pill tone="rust">{data?.filter((c) => !c.overallPass).length ?? 0} failed / quarantine</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Record check</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={data as never[] | null} empty="No quality checks recorded." onRetry={reload}
          cols={[
            { key: 'batch', label: 'Batch', render: (c: GQualityCheck) => c.batch?.code },
            { key: 'stage', label: 'Stage', render: (c: GQualityCheck) => <Pill tone="plain">{c.stage.replace('_', ' ')}</Pill> },
            { key: 'aflatoxin', label: 'Aflatoxin (ppb)', numeric: true, render: (c: GQualityCheck) => c.aflatoxinPpb ?? '—' },
            { key: 'temp', label: 'Oil temp (°C)', numeric: true, render: (c: GQualityCheck) =>
              c.oilTempCelsius == null ? '—' :
                <Pill tone={c.oilTempCelsius < 40 ? 'green' : 'rust'}>{c.oilTempCelsius}°{c.oilTempCelsius < 40 ? ' cold-press ✓' : ' TOO HOT'}</Pill> },
            { key: 'result', label: 'Result', render: (c: GQualityCheck) => <Pill tone={c.overallPass ? 'green' : 'rust'}>{c.overallPass ? 'PASS' : 'FAIL'}</Pill> },
            { key: 'checkedBy', label: 'By' },
            { key: 'checkedAt', label: 'When', render: (c: GQualityCheck) => formatDate(c.checkedAt) },
          ] as never} />
      </div>
      <QualityModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Check recorded'); reload() }} />
    </section>
  )
}

function QualityModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [batches, setBatches] = useState<GBatch[]>([])
  const [form, setForm] = useState({ batchId: '', stage: 'PRE_RELEASE', moisturePct: '', aflatoxinPpb: '', oilTempCelsius: '', notes: '', pass: 'true' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (open) gaanugu.list<GBatch>('/production-batches').then(setBatches).catch(() => undefined) }, [open])
  const valid = form.batchId
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/quality-checks', {
        batch: { id: Number(form.batchId) }, stage: form.stage,
        moisturePct: form.moisturePct ? Number(form.moisturePct) : null,
        aflatoxinPpb: form.aflatoxinPpb ? Number(form.aflatoxinPpb) : null,
        oilTempCelsius: form.oilTempCelsius ? Number(form.oilTempCelsius) : null,
        overallPass: form.pass === 'true', notes: form.notes.trim() || null, checkedBy: 'demo',
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Record quality check" sub="FSSAI panel — aflatoxin, temperature, seal. Temp under 40°C proves cold-press." open={open} onClose={onClose}>
      <Field label="Batch">
        <select className="input" style={{ width: '100%' }} value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}>
          <option value="">Select batch…</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.batchCode} — {b.product?.name}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Stage">
          <select className="input" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}>
            {['PRE_PRESS', 'POST_PRESS', 'PRE_RELEASE'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Moisture %"><input className="input" type="number" step="0.01" value={form.moisturePct} onChange={(e) => setForm((f) => ({ ...f, moisturePct: e.target.value }))} /></Field>
        <Field label="Aflatoxin ppb"><input className="input" type="number" step="0.01" value={form.aflatoxinPpb} onChange={(e) => setForm((f) => ({ ...f, aflatoxinPpb: e.target.value }))} /></Field>
        <Field label="Oil temp °C"><input className="input" type="number" step="0.1" value={form.oilTempCelsius} onChange={(e) => setForm((f) => ({ ...f, oilTempCelsius: e.target.value }))} /></Field>
        <Field label="Result">
          <select className="input" value={form.pass} onChange={(e) => setForm((f) => ({ ...f, pass: e.target.value }))}>
            <option value="true">PASS</option><option value="false">FAIL</option>
          </select>
        </Field>
      </div>
      <Field label="Notes"><input className="input" style={{ width: '100%' }} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Record check'}</Button>
      </div>
    </Modal>
  )
}

/* ================= STOCK ================= */
export function GStock() {
  const { data, error, loading, reload } = useList<GStockLevel>('/stock-levels')
  return (
    <section>
      <div className="toolbar">
        <Pill tone="forest">{data?.length ?? 0} positions</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={data as never[] | null} empty="No stock on hand." onRetry={reload}
          rowClass={((s: GStockLevel) => (available(s) < 10 ? 'row-low-stock' : undefined)) as never}
          cols={[
            { key: 'sku', label: 'SKU', render: (s: GStockLevel) => s.variant?.sku },
            { key: 'product', label: 'Oil', render: (s: GStockLevel) => s.variant?.product?.name },
            { key: 'batch', label: 'Batch', render: (s: GStockLevel) => s.batch?.code ?? '—' },
            { key: 'warehouse', label: 'Warehouse', render: (s: GStockLevel) => s.warehouse?.name },
            { key: 'onHand', label: 'On hand', numeric: true },
            { key: 'reserved', label: 'Reserved', numeric: true },
            { key: 'available', label: 'Available', numeric: true, render: (s: GStockLevel) =>
              <Pill tone={available(s) < 10 ? 'rust' : 'green'}>{available(s)}</Pill> },
            { key: 'unitCost', label: 'Unit cost', numeric: true, render: (s: GStockLevel) => (s.unitCost != null ? formatINR(s.unitCost) : '—') },
            { key: 'expiryDate', label: 'Expires', render: (s: GStockLevel) => s.expiryDate ?? '—' },
          ] as never} />
      </div>
    </section>
  )
}

/* ================= MOVEMENTS ================= */
const movementTone = (t: string) => (t.endsWith('_IN') ? 'green' : t === 'ADJUSTMENT_OUT' ? 'rust' : 'gold') as never

export function GMovements() {
  const { data, error, loading, reload } = useList<GMovement>('/stock-movements')
  return (
    <section>
      <div className="toolbar">
        <Pill tone="green">IN = received</Pill><Pill tone="gold">OUT = issued / transfer / adjustment</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={data as never[] | null} empty="No movements recorded." onRetry={reload}
          cols={[
            { key: 'movementNo', label: 'Ref' },
            { key: 'movedAt', label: 'When', render: (m: GMovement) => formatDate(m.movedAt) },
            { key: 'type', label: 'Type', render: (m: GMovement) => <Pill tone={movementTone(m.type)}>{m.type.replace(/_/g, ' ')}</Pill> },
            { key: 'sku', label: 'SKU', render: (m: GMovement) => m.variant?.sku },
            { key: 'fromTo', label: 'From → To', render: (m: GMovement) =>
              `${m.fromWarehouse?.name ?? '—'} → ${m.toWarehouse?.name ?? '—'}` },
            { key: 'quantity', label: 'Qty', numeric: true, render: (m: GMovement) =>
              <span style={{ fontWeight: 700, color: m.type.endsWith('_IN') ? 'var(--herb)' : 'var(--rust)' }}>
                {m.type.endsWith('_IN') ? '+' : '−'}{m.quantity}
              </span> },
            { key: 'referenceId', label: 'Reference' },
            { key: 'performedBy', label: 'By' },
          ] as never} />
      </div>
    </section>
  )
}

/* ================= MASTERS ================= */
const MASTER_TABS = ['Warehouses', 'Suppliers', 'Bulls', 'Operators', 'Presses'] as const

export function GMasters() {
  const [sub, setSub] = useState<(typeof MASTER_TABS)[number]>('Warehouses')
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          {MASTER_TABS.map((t) => (
            <Pill key={t} tone={sub === t ? 'forest' : 'plain'} selected={sub === t} onClick={() => setSub(t)}>{t}</Pill>
          ))}
        </div>
      </div>
      {sub === 'Warehouses' && <WarehouseTable />}
      {sub === 'Suppliers' && <SupplierTable />}
      {sub === 'Bulls' && <BullTable />}
      {sub === 'Operators' && <OperatorTable />}
      {sub === 'Presses' && <PressTable />}
    </section>
  )
}

function WarehouseTable() {
  const { data, error, loading, reload } = useList<GWarehouse>('/warehouses')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No warehouses." onRetry={reload}
    cols={[
      { key: 'code', label: 'Code', render: (w: GWarehouse) => <Pill tone="forest">{w.code}</Pill> },
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type', render: (w: GWarehouse) => <Pill tone="plain">{w.type.replace('_', ' ')}</Pill> },
      { key: 'manager', label: 'Manager', render: (w: GWarehouse) => w.managerName ?? '—' },
    ] as never} /></div>
}

function SupplierTable() {
  const { data, error, loading, reload } = useList<GSupplier>('/suppliers')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No suppliers." onRetry={reload}
    cols={[
      { key: 'code', label: 'Code', render: (s: GSupplier) => <Pill tone="forest">{s.code}</Pill> },
      { key: 'type', label: 'Type', render: (s: GSupplier) => <Pill tone={s.type === 'FARMER' ? 'green' : 'gold'}>{s.type}</Pill> },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'gst', label: 'GST' },
    ] as never} /></div>
}

function BullTable() {
  const { data, error, loading, reload } = useList<GBull>('/bulls')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No bulls registered." onRetry={reload}
    cols={[
      { key: 'code', label: 'Code', render: (b: GBull) => <Pill tone="forest">{b.code}</Pill> },
      { key: 'name', label: 'Name' },
      { key: 'breed', label: 'Breed' },
      { key: 'health', label: 'Health', render: (b: GBull) =>
        <Pill tone={b.healthStatus === 'FIT' ? 'green' : b.healthStatus === 'RESTING' ? 'gold' : 'rust'}>{b.healthStatus}</Pill> },
      { key: 'limit', label: 'Daily limit (h)', numeric: true, render: (b: GBull) => b.dailyWorkLimitHrs },
    ] as never} /></div>
}

function OperatorTable() {
  const { data, error, loading, reload } = useList<GOperator>('/press-operators')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No operators." onRetry={reload}
    cols={[
      { key: 'code', label: 'Code', render: (o: GOperator) => <Pill tone="forest">{o.code}</Pill> },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'wage', label: 'Wage', render: (o: GOperator) => `${o.wageType} · ${formatINR(o.rate)}` },
    ] as never} /></div>
}

function PressTable() {
  const { data, error, loading, reload } = useList<GPress>('/presses')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No presses." onRetry={reload}
    cols={[
      { key: 'code', label: 'Code', render: (p: GPress) => <Pill tone="forest">{p.code}</Pill> },
      { key: 'type', label: 'Type' },
      { key: 'beam', label: 'Beam', render: (p: GPress) => <Pill tone={p.beamCondition === 'GOOD' ? 'green' : p.beamCondition === 'FAIR' ? 'gold' : 'rust'}>{p.beamCondition}</Pill> },
      { key: 'status', label: 'Status', render: (p: GPress) => <Pill tone={p.status === 'ACTIVE' ? 'green' : 'slate'}>{p.status.replace('_', ' ')}</Pill> },
    ] as never} /></div>
}

/* ================= PRICES (ADR-0007) ================= */
const PRICE_TYPES = ['MRP', 'SELLING', 'COST'] as const
const priceTone = (t: string) => (t === 'MRP' ? 'forest' : t === 'SELLING' ? 'green' : 'slate') as never

export function GPrices() {
  const { data, error, loading, reload } = useList<GPriceConfig>('/price-configs')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const filtered = useMemo(() => {
    if (!data) return null
    const rows = typeFilter === 'ALL' ? data : data.filter((p) => p.priceType === typeFilter)
    return rows.slice().sort((a, b) => Number(b.active) - Number(a.active))
  }, [data, typeFilter])
  const margin = (p: GPriceConfig) => {
    if (!data || p.priceType !== 'SELLING') return null
    const cost = data.find((c) => c.variant?.id === p.variant?.id && c.priceType === 'COST' && c.active)
    return cost ? Math.round(((p.amount - cost.amount) / p.amount) * 100) : null
  }
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          <Pill tone={typeFilter === 'ALL' ? 'forest' : 'plain'} selected={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')}>All</Pill>
          {PRICE_TYPES.map((t) => (
            <Pill key={t} tone={priceTone(t)} selected={typeFilter === t} onClick={() => setTypeFilter(t)}>{t}</Pill>
          ))}
        </div>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Set price</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={filtered as never[] | null} empty="No price configurations yet." onRetry={reload}
          cols={[
            { key: 'sku', label: 'SKU', render: (p: GPriceConfig) => p.variant?.sku },
            { key: 'product', label: 'Oil', render: (p: GPriceConfig) => p.variant?.product?.name },
            { key: 'priceType', label: 'Type', render: (p: GPriceConfig) => <Pill tone={priceTone(p.priceType)}>{p.priceType}</Pill> },
            { key: 'amount', label: 'Amount (ex-GST)', numeric: true, render: (p: GPriceConfig) => formatINR(p.amount) },
            { key: 'gst', label: 'GST', numeric: true, render: (p: GPriceConfig) => `${p.gstPct}%` },
            { key: 'incl', label: 'Incl. GST', numeric: true, render: (p: GPriceConfig) => formatINR(p.amount * (1 + p.gstPct / 100)) },
            { key: 'margin', label: 'Margin', numeric: true, render: (p: GPriceConfig) => {
              const m = margin(p)
              return m === null ? '—' : <Pill tone={m >= 20 ? 'green' : m >= 10 ? 'gold' : 'rust'}>{m}%</Pill>
            } },
            { key: 'effectiveFrom', label: 'Effective' },
            { key: 'active', label: 'Status', render: (p: GPriceConfig) => <Pill tone={p.active ? 'green' : 'slate'}>{p.active ? 'ACTIVE' : 'superseded'}</Pill> },
            { key: 'notes', label: 'Notes' },
          ] as never} />
      </div>
      <PriceModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Price set'); reload() }} />
    </section>
  )
}

function PriceModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [variants, setVariants] = useState<GVariant[]>([])
  const [form, setForm] = useState({ variantId: '', priceType: 'SELLING', amount: '', gstPct: '5', effectiveFrom: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    gaanugu.list<GVariant>('/product-variants').then(setVariants).catch(() => undefined)
  }, [open])
  const valid = form.variantId && Number(form.amount) > 0 && form.effectiveFrom
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/price-configs', {
        variant: { id: Number(form.variantId) }, priceType: form.priceType,
        amount: Number(form.amount), gstPct: Number(form.gstPct) || 0,
        effectiveFrom: form.effectiveFrom, active: true, notes: form.notes.trim() || null,
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Set price" sub="Creates a new price row — history is preserved (ADR-0007)." open={open} onClose={onClose}>
      <Field label="SKU / variant">
        <select className="input" style={{ width: '100%' }} value={form.variantId} onChange={(e) => setForm((f) => ({ ...f, variantId: e.target.value }))}>
          <option value="">Select variant…</option>
          {variants.map((v) => <option key={v.id} value={v.id}>{v.sku} ({v.sizeMl} ml)</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Type">
          <select className="input" value={form.priceType} onChange={(e) => setForm((f) => ({ ...f, priceType: e.target.value }))}>
            {PRICE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Amount ex-GST (₹)"><input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></Field>
        <Field label="GST %"><input className="input" type="number" min="0" step="0.01" value={form.gstPct} onChange={(e) => setForm((f) => ({ ...f, gstPct: e.target.value }))} /></Field>
        <Field label="Effective from"><input className="input" type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></Field>
      </div>
      <Field label="Notes"><input className="input" style={{ width: '100%' }} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Festival pricing" /></Field>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Set price'}</Button>
      </div>
    </Modal>
  )
}

/* ================= ANALYTICS ================= */
export function GAnalytics() {
  const [dash, setDash] = useState<GDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trace, setTrace] = useState<Record<string, unknown>[] | null>(null)
  const load = useCallback(() => {
    setError(null)
    gaanugu.dashboard().then(setDash).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
    gaanugu.traceability().then(setTrace).catch(() => undefined)
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
        <Kpi label="QC pass rate" value={dash.qcPassRate === null ? '—' : `${dash.qcPassRate}%`} />
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
        {!trace ? <LoadingRows cols={5} /> : (
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
