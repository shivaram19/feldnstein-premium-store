import { useState, useEffect } from 'react'
import { Button, Field, Modal, OptionsError, Pill, useToast } from '../ui'
import { formatINR, formatDay } from '../api/formats'
import { type Warehouse, type Supplier, type SeedProcurement, type PurchaseOrder, gaanugu } from '../api/types'
import { useList, View } from '../api/list'

const PROC_TABS = ['Seed Procurement', 'Purchase Orders', 'Supplier Directory'] as const



export function ProcurementScreen() {
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
  const { data, error, loading, reload } = useList<SeedProcurement>('/seed-procurements?size=500')
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
          { key: 'procurementDate', label: 'Date', render: (s: SeedProcurement) => formatDay(s.procurementDate) },
          { key: 'seedType', label: 'Seed' },
          { key: 'farmer', label: 'Farmer', render: (s: SeedProcurement) => s.farmer?.name },
          { key: 'qtyKg', label: 'Qty (kg)', numeric: true },
          { key: 'rate', label: 'Rate/kg', numeric: true, render: (s: SeedProcurement) => formatINR(s.ratePerKg) },
          { key: 'total', label: 'Total', numeric: true, render: (s: SeedProcurement) => formatINR(s.totalCost) },
          { key: 'grade', label: 'Grade', render: (s: SeedProcurement) => s.qualityGrade ? <Pill tone={s.qualityGrade === 'A' ? 'green' : 'gold'}>{s.qualityGrade}</Pill> : '—' },
          { key: 'pay', label: 'Payment', render: (s: SeedProcurement) => <Pill tone={s.paymentStatus === 'PAID' ? 'green' : 'rust'}>{s.paymentStatus}</Pill> },
        ] as never} />
      <SeedPurchaseModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Purchase recorded'); reload() }} />
    </div>
  )
}

function SeedPurchaseModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [farmers, setFarmers] = useState<Supplier[]>([])
  const [form, setForm] = useState({ date: '', seedType: '', farmerId: '', qtyKg: '', ratePerKg: '', grade: 'A', transportCost: '0' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState(false)
  const loadOptions = () => {
    setOptionsError(false)
    gaanugu.list<Supplier>('/suppliers?size=500')
      .then((r) => setFarmers(r.filter((s) => s.type === 'FARMER')))
      .catch(() => setOptionsError(true))
  }
  useEffect(() => { if (open) loadOptions() }, [open])
  const total = (Number(form.qtyKg) || 0) * (Number(form.ratePerKg) || 0)
  const valid = form.date && form.seedType.trim() && form.farmerId && Number(form.qtyKg) > 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/seed-procurements?size=500', {
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
      {optionsError && <OptionsError onRetry={loadOptions} />}
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
  const { data, error, loading, reload } = useList<PurchaseOrder>('/purchase-orders?size=500')
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
          { key: 'supplier', label: 'Supplier', render: (p: PurchaseOrder) => p.supplier?.name },
          { key: 'warehouse', label: 'Deliver to', render: (p: PurchaseOrder) => p.deliveryWarehouse?.name },
          { key: 'orderDate', label: 'Ordered', render: (p: PurchaseOrder) => formatDay(p.orderDate) },
          { key: 'expected', label: 'Expected', render: (p: PurchaseOrder) => formatDay(p.expectedDelivery ?? '') },
          { key: 'status', label: 'Status', render: (p: PurchaseOrder) => <Pill tone={PO_TONE[p.status] ?? 'plain'}>{p.status.replace(/_/g, ' ')}</Pill> },
          { key: 'notes', label: 'Notes' },
        ] as never} />
      <POModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'PO raised'); reload() }} />
    </div>
  )
}

function POModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [form, setForm] = useState({ poNumber: '', supplierId: '', warehouseId: '', orderDate: '', expected: '', notes: '', itemType: 'BOTTLE', spec: '', qty: '', price: '', tax: '18' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState(false)
  const loadOptions = () => {
    setOptionsError(false)
    Promise.all([
      gaanugu.list<Supplier>('/suppliers?size=500').then((r) => setSuppliers(r.filter((s) => s.type === 'PACKAGING'))),
      gaanugu.list<Warehouse>('/warehouses?size=500').then(setWarehouses),
    ]).catch(() => setOptionsError(true))
  }
  useEffect(() => { if (open) loadOptions() }, [open])
  const valid = form.poNumber.trim() && form.supplierId && form.warehouseId && form.orderDate && Number(form.qty) > 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const po = await gaanugu.create<{ id: number }>('/purchase-orders?size=500', {
        poNumber: form.poNumber.trim(), supplier: { id: Number(form.supplierId) },
        deliveryWarehouse: { id: Number(form.warehouseId) }, orderDate: form.orderDate,
        expectedDelivery: form.expected || null, status: 'SENT', notes: form.notes.trim() || null,
      })
      if (Number(form.qty) > 0) {
        await gaanugu.create('/purchase-order-lines', {
          purchaseOrder: { id: po.id }, itemType: form.itemType, spec: form.spec.trim() || null,
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
      {optionsError && <OptionsError onRetry={loadOptions} />}
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Raise PO'}</Button>
      </div>
    </Modal>
  )
}

function SupplierTable() {
  const { data, error, loading, reload } = useList<Supplier>('/suppliers?size=500')
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
          { key: 'code', label: 'Code', render: (s: Supplier) => <Pill tone="forest">{s.code}</Pill> },
          { key: 'type', label: 'Type', render: (s: Supplier) => <Pill tone={s.type === 'FARMER' ? 'green' : 'gold'}>{s.type}</Pill> },
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
      await gaanugu.create('/suppliers?size=500', {
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
