import { useState, useEffect, useMemo } from 'react'
import { Button, ConfirmModal, Field, Modal, OptionsError, Pill, useToast } from '../ui'
import { formatDay } from '../api/formats'
import { type ProductionBatch, type Supplier, type Bull, type Operator, type Press, type OilProductRef, gaanugu, BATCH_STATUSES, batchStatusTone } from '../api/types'
import { useList, View } from '../api/list'

const NEXT_STATUS: Record<string, string | null> = {
  PRESSING: 'SEDIMENTATION', SEDIMENTATION: 'BOTTLING_READY', BOTTLING_READY: 'BOTTLING',
  BOTTLING: 'QC_PENDING', QC_PENDING: 'QC_PASSED', QC_PASSED: 'RELEASED', RELEASED: null,
}



export function BatchesScreen() {
  const { data, error, loading, reload } = useList<ProductionBatch>('/production-batches?size=500')
  const [filter, setFilter] = useState<string>('ALL')
  const [open, setOpen] = useState(false)
  const [advance, setAdvance] = useState<ProductionBatch | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const filtered = useMemo(() => !data ? null : filter === 'ALL' ? data : data.filter((b) => b.status === filter), [data, filter])
  const count = (s: string) => data?.filter((b) => b.status === s).length ?? 0

  const doAdvance = async () => {
    if (!advance) return
    setBusy(true)
    try {
      const next = NEXT_STATUS[advance.status]
      const fresh = await gaanugu.get<ProductionBatch>(`/production-batches/${advance.id}`)
      await gaanugu.update(`/production-batches/${advance.id}`, { ...fresh, status: next })
      toast('success', `${advance.batchCode} → ${next?.replace(/_/g, ' ')}`)
      setAdvance(null)
      reload()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

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
            { key: 'product', label: 'Oil', render: (b: ProductionBatch) => b.product?.name },
            { key: 'pressDate', label: 'Pressed', render: (b: ProductionBatch) => formatDay(b.pressDate) },
            { key: 'status', label: 'Status', render: (b: ProductionBatch) => <Pill tone={batchStatusTone(b.status)}>{b.status.replace('_', ' ')}</Pill> },
            { key: 'yield', label: 'Yield (L)', numeric: true, render: (b: ProductionBatch) => b.oilYieldLitres ?? '—' },
            { key: 'bull', label: 'Bull', render: (b: ProductionBatch) => b.bull?.name },
            { key: 'operator', label: 'Operator', render: (b: ProductionBatch) => b.operator?.name },
            { key: 'bestBefore', label: 'Best before', render: (b: ProductionBatch) => formatDay(b.bestBeforeDate ?? '') },
            { key: 'advance', label: '', render: (b: ProductionBatch) => NEXT_STATUS[b.status]
              ? <Button variant="ghost" small onClick={() => setAdvance(b)}>→ {NEXT_STATUS[b.status]!.replace(/_/g, ' ')}</Button>
              : <Pill tone="green">released</Pill> },
          ] as never} />
      </div>
      <BatchModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Batch recorded'); reload() }} />
      <ConfirmModal open={!!advance}
        title={`Advance ${advance?.batchCode ?? ''}`}
        sub={advance && NEXT_STATUS[advance.status]
          ? `Move this batch from ${advance.status.replace(/_/g, ' ')} to ${NEXT_STATUS[advance.status]!.replace(/_/g, ' ')}? The lifecycle only moves forward.`
          : undefined}
        confirmLabel="Advance status" busy={busy}
        onClose={() => setAdvance(null)} onConfirm={doAdvance} />
    </section>
  )
}

function BatchModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [products, setProducts] = useState<OilProductRef[]>([])
  const [farmers, setFarmers] = useState<Supplier[]>([])
  const [bulls, setBulls] = useState<Bull[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [presses, setPresses] = useState<Press[]>([])
  const [form, setForm] = useState({ batchCode: '', productId: '', pressDate: new Date().toISOString().slice(0, 10), seedType: '', seedQtyKg: '', seedCostTotal: '', farmerId: '', bullId: '', operatorId: '', pressId: '', weatherNotes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState(false)
  const loadOptions = () => {
    setOptionsError(false)
    Promise.all([
      gaanugu.list<OilProductRef>('/oil-products?size=500').then(setProducts),
      gaanugu.list<Supplier>('/suppliers?size=500').then((r) => setFarmers(r.filter((s) => s.type === 'FARMER'))),
      gaanugu.list<Bull>('/bulls').then(setBulls),
      gaanugu.list<Operator>('/press-operators').then(setOperators),
      gaanugu.list<Press>('/presses').then(setPresses),
    ]).catch(() => setOptionsError(true))
  }
  useEffect(() => { if (open) loadOptions() }, [open])
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const valid = form.batchCode.trim() && form.productId && form.pressDate && Number(form.seedQtyKg) > 0 && Number(form.seedCostTotal) >= 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/production-batches?size=500', {
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
      {optionsError && <OptionsError onRetry={loadOptions} />}
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Record batch'}</Button>
      </div>
    </Modal>
  )
}
