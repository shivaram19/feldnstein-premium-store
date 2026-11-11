import { useState, useEffect } from 'react'
import { Button, Field, Modal, OptionsError, Pill, useToast } from '../ui'
import { formatDay } from '../api/formats'
import { type PurchaseOrder, type PurchaseOrderLine, type GoodsReceipt, gaanugu } from '../api/types'
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
            { key: 'po', label: 'PO', render: (g: GoodsReceipt) =>
              g.purchaseOrder?.poNumber ?? (g.purchaseOrder?.id ? `PO #${g.purchaseOrder.id}` : g.po?.code ?? g.po?.name ?? '—') },
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

interface DraftGrnLine { poLineId: string; qtyReceived: string; qtyDamaged: string; qtyShort: string }

function GrnModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [poLines, setPoLines] = useState<PurchaseOrderLine[]>([])
  const [form, setForm] = useState({ grnNumber: '', poId: '', receiptDate: '', deliveryNote: '', condition: '', receivedBy: '' })
  const [lines, setLines] = useState<DraftGrnLine[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState(false)
  const loadOptions = () => {
    setOptionsError(false)
    Promise.all([
      gaanugu.list<PurchaseOrder>('/purchase-orders?size=500'),
      gaanugu.list<PurchaseOrderLine>('/purchase-order-lines?size=500'),
    ]).then(([poRows, lineRows]) => { setPos(poRows); setPoLines(lineRows) })
      .catch(() => setOptionsError(true))
  }
  useEffect(() => { if (open) loadOptions() }, [open])
  const valid = form.grnNumber.trim() && form.poId && form.receiptDate

  const selectPo = (poId: string) => {
    setForm((f) => ({ ...f, poId }))
    setLines(poId
      ? poLines
          .filter((l) => l.purchaseOrder?.id === Number(poId))
          .map((l) => ({ poLineId: String(l.id), qtyReceived: String(l.quantity), qtyDamaged: '0', qtyShort: '0' }))
      : [])
  }

  const setLine = (i: number, patch: Partial<DraftGrnLine>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const grn = await gaanugu.create<{ id: number }>('/goods-receipts?size=500', {
        grnNumber: form.grnNumber.trim(), purchaseOrder: { id: Number(form.poId) }, receiptDate: form.receiptDate,
        deliveryNoteNo: form.deliveryNote.trim() || null, conditionNote: form.condition.trim() || null,
        receivedBy: form.receivedBy.trim() || null,
      })
      for (const l of lines) {
        if (!l.poLineId) continue
        await gaanugu.create('/goods-receipt-lines', {
          goodsReceipt: { id: grn.id }, poLine: { id: Number(l.poLineId) },
          qtyReceived: Math.max(0, Math.round(Number(l.qtyReceived) || 0)),
          qtyDamaged: Math.max(0, Math.round(Number(l.qtyDamaged) || 0)),
          qtyShort: Math.max(0, Math.round(Number(l.qtyShort) || 0)),
        })
      }
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
        <select className="input" style={{ width: '100%' }} value={form.poId} onChange={(e) => selectPo(e.target.value)}>
          <option value="">Select PO…</option>
          {pos.map((p) => <option key={p.id} value={p.id}>{p.poNumber} — {p.supplier?.name}</option>)}
        </select>
      </Field>
      {lines.length > 0 && (
        <Field label="Lines received — qty received / damaged / short">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map((l, i) => {
              const poLine = poLines.find((pl) => String(pl.id) === l.poLineId)
              return (
                <div key={l.poLineId} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ flex: '1 1 220px', fontSize: 13 }}>
                    {poLine?.itemType}{poLine?.spec ? ` — ${poLine.spec}` : ''}
                    <small style={{ color: 'var(--muted)' }}> (ordered {poLine?.quantity ?? '—'})</small>
                  </span>
                  <input className="input" type="number" min="0" step="1" style={{ width: 110 }} value={l.qtyReceived}
                    title="Qty received" placeholder="Received" onChange={(e) => setLine(i, { qtyReceived: e.target.value })} />
                  <input className="input" type="number" min="0" step="1" style={{ width: 100 }} value={l.qtyDamaged}
                    title="Qty damaged" placeholder="Damaged" onChange={(e) => setLine(i, { qtyDamaged: e.target.value })} />
                  <input className="input" type="number" min="0" step="1" style={{ width: 90 }} value={l.qtyShort}
                    title="Qty short" placeholder="Short" onChange={(e) => setLine(i, { qtyShort: e.target.value })} />
                </div>
              )
            })}
          </div>
        </Field>
      )}
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
