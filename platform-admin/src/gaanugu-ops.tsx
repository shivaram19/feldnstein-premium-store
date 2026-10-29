import { useEffect, useMemo, useState } from 'react'
import { formatDate, formatINR } from './api'
import {
  gaanugu, type GBull, type GBullWorkLog, type GGoodsReceipt, type GMovement, type GPurchaseOrder,
  type GSeedProcurement, type GStockLevel, type GSupplier, type GWarehouse, type NamedRef,
} from './gaanugu-api'
import { useList, View } from './gaanugu-screens'
import { Button, DataTable, Field, Modal, Pill, useToast } from './ui'

const avail = (s: GStockLevel) => s.onHand - s.reserved - (s.onHold ?? 0)

/* ================= PROCUREMENT ================= */
const PROC_TABS = ['Seed Procurement', 'Purchase Orders', 'Supplier Directory'] as const

export function GProcurement() {
  const [sub, setSub] = useState<(typeof PROC_TABS)[number]>('Seed Procurement')
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          {PROC_TABS.map((t) => (
            <Pill key={t} tone={sub === t ? 'forest' : 'plain'} selected={sub === t} onClick={() => setSub(t)}>{t}</Pill>
          ))}
        </div>
      </div>
      {sub === 'Seed Procurement' && <SeedProcurementTable />}
      {sub === 'Purchase Orders' && <PurchaseOrderTable />}
      {sub === 'Supplier Directory' && <SupplierTable />}
    </section>
  )
}

function SeedProcurementTable() {
  const { data, error, loading, reload } = useList<GSeedProcurement>('/seed-procurements')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  return (
    <div className="card">
      <div className="toolbar" style={{ padding: '12px 16px 0' }}>
        <Pill tone="forest">{data?.length ?? 0} purchases</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Record purchase</Button>
      </div>
      <View loading={loading} error={error} rows={data as never[] | null} empty="No seed purchases recorded." onRetry={reload}
        cols={[
          { key: 'procurementDate', label: 'Date' },
          { key: 'seedType', label: 'Seed' },
          { key: 'farmer', label: 'Farmer', render: (s: GSeedProcurement) => s.farmer?.name },
          { key: 'qtyKg', label: 'Qty (kg)', numeric: true },
          { key: 'rate', label: 'Rate/kg', numeric: true, render: (s: GSeedProcurement) => formatINR(s.ratePerKg) },
          { key: 'total', label: 'Total', numeric: true, render: (s: GSeedProcurement) => formatINR(s.totalCost) },
          { key: 'grade', label: 'Grade', render: (s: GSeedProcurement) => s.qualityGrade ? <Pill tone={s.qualityGrade === 'A' ? 'green' : 'gold'}>{s.qualityGrade}</Pill> : '—' },
          { key: 'pay', label: 'Payment', render: (s: GSeedProcurement) => <Pill tone={s.paymentStatus === 'PAID' ? 'green' : 'rust'}>{s.paymentStatus}</Pill> },
        ] as never} />
      <SeedPurchaseModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Purchase recorded'); reload() }} />
    </div>
  )
}

function SeedPurchaseModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [farmers, setFarmers] = useState<GSupplier[]>([])
  const [form, setForm] = useState({ date: '', seedType: '', farmerId: '', qtyKg: '', ratePerKg: '', grade: 'A', transportCost: '0' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    gaanugu.list<GSupplier>('/suppliers').then((r) => setFarmers(r.filter((s) => s.type === 'FARMER'))).catch(() => undefined)
  }, [open])
  const total = (Number(form.qtyKg) || 0) * (Number(form.ratePerKg) || 0)
  const valid = form.date && form.seedType.trim() && form.farmerId && Number(form.qtyKg) > 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/seed-procurements', {
        procurementDate: form.date, seedType: form.seedType.trim(),
        farmer: { id: Number(form.farmerId) }, qtyKg: Number(form.qtyKg), ratePerKg: Number(form.ratePerKg),
        totalCost: total, qualityGrade: form.grade, paymentStatus: 'PENDING',
        transportCost: Number(form.transportCost) || 0,
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Record seed purchase" sub="Seeds are 40-50% of cost — traceability starts here." open={open} onClose={onClose}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Date"><input className="input" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
        <Field label="Seed type"><input className="input" value={form.seedType} onChange={(e) => setForm((f) => ({ ...f, seedType: e.target.value }))} placeholder="Groundnut (Java)" /></Field>
        <Field label="Farmer">
          <select className="input" value={form.farmerId} onChange={(e) => setForm((f) => ({ ...f, farmerId: e.target.value }))}>
            <option value="">Select…</option>
            {farmers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Qty (kg)"><input className="input" type="number" min="0" value={form.qtyKg} onChange={(e) => setForm((f) => ({ ...f, qtyKg: e.target.value }))} /></Field>
        <Field label="Rate/kg (₹)"><input className="input" type="number" min="0" step="0.01" value={form.ratePerKg} onChange={(e) => setForm((f) => ({ ...f, ratePerKg: e.target.value }))} /></Field>
        <Field label="Transport (₹)"><input className="input" type="number" min="0" value={form.transportCost} onChange={(e) => setForm((f) => ({ ...f, transportCost: e.target.value }))} /></Field>
        <Field label="Quality grade">
          <select className="input" value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}>
            {['A', 'B', 'C'].map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>Total cost: <strong>{formatINR(total)}</strong></p>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Record purchase'}</Button>
      </div>
    </Modal>
  )
}

const PO_TONE: Record<string, 'green' | 'gold' | 'rust' | 'slate' | 'forest'> = {
  DRAFT: 'slate', SENT: 'gold', PARTIALLY_RECEIVED: 'gold', RECEIVED: 'green', CANCELLED: 'rust',
}

function PurchaseOrderTable() {
  const { data, error, loading, reload } = useList<GPurchaseOrder>('/purchase-orders')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  return (
    <div className="card">
      <div className="toolbar" style={{ padding: '12px 16px 0' }}>
        <Pill tone="forest">{data?.length ?? 0} POs</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Raise PO</Button>
      </div>
      <View loading={loading} error={error} rows={data as never[] | null} empty="No purchase orders raised." onRetry={reload}
        cols={[
          { key: 'poNumber', label: 'PO #' },
          { key: 'supplier', label: 'Supplier', render: (p: GPurchaseOrder) => p.supplier?.name },
          { key: 'warehouse', label: 'Deliver to', render: (p: GPurchaseOrder) => p.deliveryWarehouse?.name },
          { key: 'orderDate', label: 'Ordered' },
          { key: 'expected', label: 'Expected', render: (p: GPurchaseOrder) => p.expectedDelivery ?? '—' },
          { key: 'status', label: 'Status', render: (p: GPurchaseOrder) => <Pill tone={PO_TONE[p.status] ?? 'plain'}>{p.status.replace(/_/g, ' ')}</Pill> },
          { key: 'notes', label: 'Notes' },
        ] as never} />
      <POModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'PO raised'); reload() }} />
    </div>
  )
}

function POModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [suppliers, setSuppliers] = useState<GSupplier[]>([])
  const [warehouses, setWarehouses] = useState<GWarehouse[]>([])
  const [form, setForm] = useState({ poNumber: '', supplierId: '', warehouseId: '', orderDate: '', expected: '', notes: '', itemType: 'BOTTLE', spec: '', qty: '', price: '', tax: '18' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    gaanugu.list<GSupplier>('/suppliers').then((r) => setSuppliers(r.filter((s) => s.type === 'PACKAGING'))).catch(() => undefined)
    gaanugu.list<GWarehouse>('/warehouses').then(setWarehouses).catch(() => undefined)
  }, [open])
  const valid = form.poNumber.trim() && form.supplierId && form.warehouseId && form.orderDate && Number(form.qty) > 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const po = await gaanugu.create<{ id: number }>('/purchase-orders', {
        poNumber: form.poNumber.trim(), supplier: { id: Number(form.supplierId) },
        deliveryWarehouse: { id: Number(form.warehouseId) }, orderDate: form.orderDate,
        expectedDelivery: form.expected || null, status: 'SENT', notes: form.notes.trim() || null,
      })
      if (Number(form.qty) > 0) {
        await gaanugu.create('/purchase-order-lines', {
          po: { id: po.id }, itemType: form.itemType, spec: form.spec.trim() || null,
          quantity: Number(form.qty), unitPrice: Number(form.price) || 0, taxPct: Number(form.tax) || 0,
        })
      }
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Raise purchase order" sub="Packaging: bottles, caps, labels, outer boxes." open={open} onClose={onClose}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="PO #"><input className="input" value={form.poNumber} onChange={(e) => setForm((f) => ({ ...f, poNumber: e.target.value }))} placeholder="PO-2026-012" autoFocus /></Field>
        <Field label="Order date"><input className="input" type="date" value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} /></Field>
        <Field label="Expected delivery"><input className="input" type="date" value={form.expected} onChange={(e) => setForm((f) => ({ ...f, expected: e.target.value }))} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Packaging supplier">
          <select className="input" value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}>
            <option value="">Select…</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Deliver to warehouse">
          <select className="input" value={form.warehouseId} onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}>
            <option value="">Select…</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Item">
          <select className="input" value={form.itemType} onChange={(e) => setForm((f) => ({ ...f, itemType: e.target.value }))}>
            {['BOTTLE', 'CAP', 'LABEL', 'OUTER_BOX', 'OTHER'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Spec"><input className="input" value={form.spec} onChange={(e) => setForm((f) => ({ ...f, spec: e.target.value }))} placeholder="500ml amber glass, 28mm neck" style={{ minWidth: 220 }} /></Field>
        <Field label="Qty"><input className="input" type="number" min="0" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} /></Field>
        <Field label="Unit price (₹)"><input className="input" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} /></Field>
        <Field label="Tax %"><input className="input" type="number" min="0" value={form.tax} onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))} /></Field>
      </div>
      <Field label="Notes"><input className="input" style={{ width: '100%' }} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Raise PO'}</Button>
      </div>
    </Modal>
  )
}

function SupplierTable() {
  const { data, error, loading, reload } = useList<GSupplier>('/suppliers')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  return (
    <div className="card">
      <div className="toolbar" style={{ padding: '12px 16px 0' }}>
        <Pill tone="forest">{data?.length ?? 0} suppliers</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Add supplier</Button>
      </div>
      <View loading={loading} error={error} rows={data as never[] | null} empty="No farmers or vendors on board." onRetry={reload}
        cols={[
          { key: 'code', label: 'Code', render: (s: GSupplier) => <Pill tone="forest">{s.code}</Pill> },
          { key: 'type', label: 'Type', render: (s: GSupplier) => <Pill tone={s.type === 'FARMER' ? 'green' : 'gold'}>{s.type}</Pill> },
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'address', label: 'Address' },
          { key: 'gst', label: 'GST' },
        ] as never} />
      <SupplierModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Supplier added'); reload() }} />
    </div>
  )
}

function SupplierModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ code: '', type: 'FARMER', name: '', phone: '', address: '', gst: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = form.code.trim() && form.name.trim()
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/suppliers', {
        code: form.code.trim(), type: form.type, name: form.name.trim(), phone: form.phone.trim() || null,
        address: form.address.trim() || null, gst: form.gst.trim() || null, active: true,
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Add supplier" sub="Farmer (seed source) or packaging vendor." open={open} onClose={onClose}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Code"><input className="input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="F-012 / P-004" autoFocus /></Field>
        <Field label="Type">
          <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option>FARMER</option><option>PACKAGING</option>
          </select>
        </Field>
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
        <Field label="GST"><input className="input" value={form.gst} onChange={(e) => setForm((f) => ({ ...f, gst: e.target.value }))} /></Field>
      </div>
      <Field label="Address"><input className="input" style={{ width: '100%' }} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></Field>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Add supplier'}</Button>
      </div>
    </Modal>
  )
}

/* ================= WAREHOUSES ================= */
export function GWarehouses() {
  const { data, error, loading, reload } = useList<GWarehouse>('/warehouses')
  const stock = useList<GStockLevel>('/stock-levels')
  const [selected, setSelected] = useState<number | null>(null)
  const active = data?.find((w) => w.id === selected)
  const stockRows = useMemo(
    () => stock.data?.filter((s) => s.warehouse?.id === selected) ?? null,
    [stock.data, selected])
  return (
    <section>
      <div className="card">
        <div className="toolbar" style={{ padding: '12px 16px 0' }}>
          <Pill tone="forest">{data?.length ?? 0} warehouses</Pill>
          <div className="spacer" />
          <Button variant="ghost" small onClick={() => { reload(); stock.reload() }}>Refresh</Button>
        </div>
        <View loading={loading} error={error} rows={data as never[] | null} empty="No warehouses defined." onRetry={reload}
          rowClass={((w: GWarehouse) => (w.id === selected ? 'row-selected' : undefined)) as never}
          cols={[
            { key: 'code', label: 'Code', render: (w: GWarehouse) => <Pill tone="forest">{w.code}</Pill> },
            { key: 'name', label: 'Name' },
            { key: 'type', label: 'Type', render: (w: GWarehouse) => <Pill tone="plain">{w.type.replace(/_/g, ' ')}</Pill> },
            { key: 'manager', label: 'Manager', render: (w: GWarehouse) => w.managerName ?? '—' },
            { key: 'units', label: 'Units held', numeric: true, render: (w: GWarehouse) =>
              stock.data?.filter((s) => s.warehouse?.id === w.id).reduce((n, s) => n + s.onHand, 0) ?? '—' },
            { key: 'open', label: '', render: (w: GWarehouse) => <Button variant="ghost" small onClick={() => setSelected(w.id === selected ? null : w.id)}>{selected === w.id ? 'Close' : 'View stock'}</Button> },
          ] as never} />
      </div>
      {active && (
        <div className="card" style={{ marginTop: 22 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Stock at {active.name}
          </div>
          {stock.loading ? <p style={{ padding: 16 }}>Loading…</p>
            : !stockRows || stockRows.length === 0 ? <p style={{ padding: 16, color: 'var(--muted)' }}>No stock held at this warehouse.</p>
            : <DataTable columns={[
                { key: 'sku', label: 'SKU', render: (s: GStockLevel) => s.variant?.sku },
                { key: 'product', label: 'Oil', render: (s: GStockLevel) => s.variant?.product?.name },
                { key: 'batch', label: 'Batch', render: (s: GStockLevel) => s.batch?.code ?? '—' },
                { key: 'onHand', label: 'On hand', numeric: true },
                { key: 'reserved', label: 'Reserved', numeric: true },
                { key: 'available', label: 'Available', numeric: true, render: (s: GStockLevel) => <Pill tone={avail(s) < 10 ? 'rust' : 'green'}>{avail(s)}</Pill> },
                { key: 'expiry', label: 'Expires', render: (s: GStockLevel) => s.expiryDate ?? '—' },
              ] as never} rows={stockRows as never[]} />}
        </div>
      )}
    </section>
  )
}

/* ================= BULL & PRESS ================= */
const BP_TABS = ['Bulls', 'Work Logs', 'Presses'] as const

export function GBullPress() {
  const [sub, setSub] = useState<(typeof BP_TABS)[number]>('Bulls')
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          {BP_TABS.map((t) => (
            <Pill key={t} tone={sub === t ? 'forest' : 'plain'} selected={sub === t} onClick={() => setSub(t)}>{t}</Pill>
          ))}
        </div>
      </div>
      {sub === 'Bulls' && <BullTable />}
      {sub === 'Work Logs' && <WorkLogTable />}
      {sub === 'Presses' && <PressTable />}
    </section>
  )
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
      { key: 'vet', label: 'Next vet check', render: (b: GBull) => (b as unknown as { nextVetCheck?: string }).nextVetCheck ?? '—' },
    ] as never} /></div>
}

function WorkLogTable() {
  const { data, error, loading, reload } = useList<GBullWorkLog>('/bull-work-logs')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No work sessions logged." onRetry={reload}
    cols={[
      { key: 'workDate', label: 'Date' },
      { key: 'bull', label: 'Bull', render: (w: GBullWorkLog) => w.bull?.name },
      { key: 'batch', label: 'Batch', render: (w: GBullWorkLog) => w.batch?.code ?? '—' },
      { key: 'hours', label: 'Hours worked', numeric: true, render: (w: GBullWorkLog) =>
        <Pill tone={w.hoursWorked > 4 ? 'rust' : 'green'}>{w.hoursWorked}</Pill> },
      { key: 'health', label: 'Observation', render: (w: GBullWorkLog) => w.healthObservation ?? '—' },
    ] as never} /></div>
}

type PressRow = NamedRef & { type?: string; beamCondition: string; status: string; nextMaintenanceDue?: string }

function PressTable() {
  const { data, error, loading, reload } = useList<PressRow>('/presses')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No presses registered." onRetry={reload}
    cols={[
      { key: 'code', label: 'Code', render: (p: PressRow) => <Pill tone="forest">{p.code}</Pill> },
      { key: 'type', label: 'Type' },
      { key: 'beam', label: 'Beam', render: (p: PressRow) => <Pill tone={p.beamCondition === 'GOOD' ? 'green' : p.beamCondition === 'FAIR' ? 'gold' : 'rust'}>{p.beamCondition}</Pill> },
      { key: 'maintenance', label: 'Next maintenance', render: (p: PressRow) => p.nextMaintenanceDue ?? '—' },
      { key: 'status', label: 'Status', render: (p: PressRow) => <Pill tone={p.status === 'ACTIVE' ? 'green' : 'slate'}>{p.status.replace(/_/g, ' ')}</Pill> },
    ] as never} /></div>
}

/* ================= TRANSFER ================= */
export function GTransfer() {
  const stock = useList<GStockLevel>('/stock-levels')
  const movements = useList<GMovement>('/stock-movements')
  const warehouses = useList<GWarehouse>('/warehouses')
  const [form, setForm] = useState({ stockLevelId: '', toWarehouseId: '', quantity: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const from = stock.data?.find((s) => String(s.id) === form.stockLevelId)
  const transfers = useMemo(
    () => movements.data?.filter((m) => m.type.startsWith('TRANSFER')).slice(0, 12) ?? null,
    [movements.data])
  const valid = form.stockLevelId && form.toWarehouseId && form.stockLevelId !== form.toWarehouseId && Number(form.quantity) > 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.post('/stock/transfers', {
        stockLevelId: Number(form.stockLevelId), toWarehouseId: Number(form.toWarehouseId),
        quantity: Number(form.quantity), reason: form.reason.trim() || null,
      })
      toast('success', 'Transfer posted')
      setForm({ stockLevelId: '', toWarehouseId: '', quantity: '', reason: '' })
      stock.reload(); movements.reload()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <section>
      <div className="card" style={{ maxWidth: 720 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Move stock between warehouses
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="From (stock position)">
            <select className="input" style={{ width: '100%' }} value={form.stockLevelId} onChange={(e) => setForm((f) => ({ ...f, stockLevelId: e.target.value }))}>
              <option value="">Select stock…</option>
              {stock.data?.map((s) => <option key={s.id} value={s.id}>{s.variant?.sku} · {s.warehouse?.name} · avail {avail(s)}</option>)}
            </select>
          </Field>
          <Field label="To warehouse">
            <select className="input" style={{ width: '100%' }} value={form.toWarehouseId} onChange={(e) => setForm((f) => ({ ...f, toWarehouseId: e.target.value }))}>
              <option value="">Select…</option>
              {warehouses.data?.filter((w) => w.id !== from?.warehouse?.id).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Quantity"><input className="input" type="number" min="1" max={from ? avail(from) : undefined} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /></Field>
            <Field label="Reason"><input className="input" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Dispatch to fulfilment hub" style={{ minWidth: 240 }} /></Field>
          </div>
          {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
          <div>
            <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Posting…' : 'Post transfer'}</Button>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 22 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Recent transfers
        </div>
        <View loading={movements.loading} error={movements.error} rows={transfers as never[] | null} empty="No transfers yet." onRetry={movements.reload}
          cols={[
            { key: 'movedAt', label: 'When', render: (m: GMovement) => formatDate(m.movedAt) },
            { key: 'type', label: 'Type', render: (m: GMovement) => <Pill tone={m.type === 'TRANSFER_IN' ? 'green' : 'gold'}>{m.type.replace(/_/g, ' ')}</Pill> },
            { key: 'sku', label: 'SKU', render: (m: GMovement) => m.variant?.sku },
            { key: 'fromTo', label: 'From → To', render: (m: GMovement) => `${m.fromWarehouse?.name ?? '—'} → ${m.toWarehouse?.name ?? '—'}` },
            { key: 'quantity', label: 'Qty', numeric: true },
            { key: 'referenceId', label: 'Ref' },
          ] as never} />
      </div>
    </section>
  )
}

/* ================= ADJUSTMENT ================= */
const ADJ_TYPES = ['DAMAGE', 'SPOILAGE', 'EXPIRY', 'THEFT', 'COUNT']

export function GAdjustment() {
  const stock = useList<GStockLevel>('/stock-levels')
  const movements = useList<GMovement>('/stock-movements')
  const [form, setForm] = useState({ stockLevelId: '', adjustedQty: '', type: 'DAMAGE', reason: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const selected = stock.data?.find((s) => String(s.id) === form.stockLevelId)
  const adjustments = useMemo(
    () => movements.data?.filter((m) => m.type.startsWith('ADJUSTMENT')).slice(0, 12) ?? null,
    [movements.data])
  const valid = form.stockLevelId && form.adjustedQty !== '' && Number(form.adjustedQty) >= 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const res = await gaanugu.post<{ delta: number }>('/stock/adjustments', {
        stockLevelId: Number(form.stockLevelId), adjustedQty: Number(form.adjustedQty),
        type: form.type, reason: form.reason.trim() || null,
      })
      toast('success', `Adjustment posted (delta ${res.delta > 0 ? '+' : ''}${res.delta})`)
      setForm({ stockLevelId: '', adjustedQty: '', type: 'DAMAGE', reason: '' })
      stock.reload(); movements.reload()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <section>
      <div className="card" style={{ maxWidth: 720 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Correct system stock to physical count
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Stock position">
            <select className="input" style={{ width: '100%' }} value={form.stockLevelId} onChange={(e) => setForm((f) => ({ ...f, stockLevelId: e.target.value, adjustedQty: '' }))}>
              <option value="">Select stock…</option>
              {stock.data?.map((s) => <option key={s.id} value={s.id}>{s.variant?.sku} · {s.warehouse?.name} · on hand {s.onHand}</option>)}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Physical count">
              <input className="input" type="number" min="0" value={form.adjustedQty} onChange={(e) => setForm((f) => ({ ...f, adjustedQty: e.target.value }))} />
            </Field>
            <Field label="Type">
              <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {ADJ_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Reason"><input className="input" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Broken bottles in transit" style={{ minWidth: 220 }} /></Field>
          </div>
          {selected && form.adjustedQty !== '' && Number(form.adjustedQty) !== selected.onHand && (
            <p style={{ margin: 0, fontSize: 13 }}>
              Delta: <strong style={{ color: Number(form.adjustedQty) < selected.onHand ? 'var(--rust)' : 'var(--herb)' }}>
                {Number(form.adjustedQty) - selected.onHand > 0 ? '+' : ''}{Number(form.adjustedQty) - selected.onHand}
              </strong> — a ledger entry will be written automatically.
            </p>
          )}
          {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
          <div>
            <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Posting…' : 'Post adjustment'}</Button>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 22 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Recent adjustments
        </div>
        <View loading={movements.loading} error={movements.error} rows={adjustments as never[] | null} empty="No adjustments yet." onRetry={movements.reload}
          cols={[
            { key: 'movedAt', label: 'When', render: (m: GMovement) => formatDate(m.movedAt) },
            { key: 'type', label: 'Type', render: (m: GMovement) => <Pill tone={m.type === 'ADJUSTMENT_IN' ? 'green' : 'rust'}>{m.type.replace(/_/g, ' ')}</Pill> },
            { key: 'sku', label: 'SKU', render: (m: GMovement) => m.variant?.sku },
            { key: 'quantity', label: 'Qty', numeric: true },
            { key: 'reason', label: 'Reason' },
            { key: 'referenceId', label: 'Ref' },
          ] as never} />
      </div>
    </section>
  )
}

/* ================= GOODS RECEIPT (GRN) ================= */
export function GGrn() {
  const { data, error, loading, reload } = useList<GGoodsReceipt>('/goods-receipts')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  return (
    <section>
      <div className="toolbar">
        <Pill tone="forest">3-way match: PO → receipt → invoice</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Record receipt</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={data as never[] | null} empty="No goods receipts recorded." onRetry={reload}
          cols={[
            { key: 'grnNumber', label: 'GRN #' },
            { key: 'po', label: 'PO', render: (g: GGoodsReceipt) => g.po?.code },
            { key: 'receiptDate', label: 'Received' },
            { key: 'deliveryNoteNo', label: 'Delivery note' },
            { key: 'condition', label: 'Condition', render: (g: GGoodsReceipt) => g.conditionNote ?? '—' },
            { key: 'receivedBy', label: 'Received by' },
          ] as never} />
      </div>
      <GrnModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Receipt recorded'); reload() }} />
    </section>
  )
}

function GrnModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [pos, setPos] = useState<GPurchaseOrder[]>([])
  const [form, setForm] = useState({ grnNumber: '', poId: '', receiptDate: '', deliveryNote: '', condition: '', receivedBy: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    gaanugu.list<GPurchaseOrder>('/purchase-orders').then(setPos).catch(() => undefined)
  }, [open])
  const valid = form.grnNumber.trim() && form.poId && form.receiptDate
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/goods-receipts', {
        grnNumber: form.grnNumber.trim(), po: { id: Number(form.poId) }, receiptDate: form.receiptDate,
        deliveryNoteNo: form.deliveryNote.trim() || null, conditionNote: form.condition.trim() || null,
        receivedBy: form.receivedBy.trim() || null,
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Record goods receipt" sub="Header entry — line-level received/damaged/short via API for now." open={open} onClose={onClose}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="GRN #"><input className="input" value={form.grnNumber} onChange={(e) => setForm((f) => ({ ...f, grnNumber: e.target.value }))} placeholder="GRN-2026-007" autoFocus /></Field>
        <Field label="Receipt date"><input className="input" type="date" value={form.receiptDate} onChange={(e) => setForm((f) => ({ ...f, receiptDate: e.target.value }))} /></Field>
        <Field label="Delivery note #"><input className="input" value={form.deliveryNote} onChange={(e) => setForm((f) => ({ ...f, deliveryNote: e.target.value }))} /></Field>
      </div>
      <Field label="Purchase order">
        <select className="input" style={{ width: '100%' }} value={form.poId} onChange={(e) => setForm((f) => ({ ...f, poId: e.target.value }))}>
          <option value="">Select PO…</option>
          {pos.map((p) => <option key={p.id} value={p.id}>{p.poNumber} — {p.supplier?.name}</option>)}
        </select>
      </Field>
      <Field label="Condition note"><input className="input" style={{ width: '100%' }} value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))} placeholder="One carton smashed in transit" /></Field>
      <Field label="Received by"><input className="input" style={{ width: '100%' }} value={form.receivedBy} onChange={(e) => setForm((f) => ({ ...f, receivedBy: e.target.value }))} /></Field>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Record receipt'}</Button>
      </div>
    </Modal>
  )
}
