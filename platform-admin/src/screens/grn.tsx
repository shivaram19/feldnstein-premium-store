import { useState, useEffect } from 'react'
import { Button, Field, Modal, OptionsError, Pill, useToast } from '../ui'
import { formatDay } from '../api/formats'
import { type PurchaseOrder, type GoodsReceipt, gaanugu } from '../api/types'
import { useList, View } from '../api/list'

export function GrnScreen() {
  const { data, error, loading, reload } = useList<GoodsReceipt>('/goods-receipts?size=500')
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
            { key: 'po', label: 'PO', render: (g: GoodsReceipt) => g.po?.code },
            { key: 'receiptDate', label: 'Received', render: (g: GoodsReceipt) => formatDay(g.receiptDate) },
            { key: 'deliveryNoteNo', label: 'Delivery note' },
            { key: 'condition', label: 'Condition', render: (g: GoodsReceipt) => g.conditionNote ?? '—' },
            { key: 'receivedBy', label: 'Received by' },
          ] as never} />
      </div>
      <GrnModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Receipt recorded'); reload() }} />
    </section>
  )
}

function GrnModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [form, setForm] = useState({ grnNumber: '', poId: '', receiptDate: '', deliveryNote: '', condition: '', receivedBy: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState(false)
  const loadOptions = () => {
    setOptionsError(false)
    gaanugu.list<PurchaseOrder>('/purchase-orders?size=500').then(setPos).catch(() => setOptionsError(true))
  }
  useEffect(() => { if (open) loadOptions() }, [open])
  const valid = form.grnNumber.trim() && form.poId && form.receiptDate
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/goods-receipts?size=500', {
        grnNumber: form.grnNumber.trim(), purchaseOrder: { id: Number(form.poId) }, receiptDate: form.receiptDate,
        deliveryNoteNo: form.deliveryNote.trim() || null, conditionNote: form.condition.trim() || null,
        receivedBy: form.receivedBy.trim() || null,
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Record goods receipt" sub="Match the delivery against its purchase order — note any damage or shortage." open={open} onClose={onClose}>
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
      {optionsError && <OptionsError onRetry={loadOptions} />}
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Record receipt'}</Button>
      </div>
    </Modal>
  )
}
