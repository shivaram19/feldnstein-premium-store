import { useState, useMemo } from 'react'
import { Button, ConfirmModal, Field, OptionsError, Pill, useToast } from '../ui'
import { formatDate } from '../api/formats'
import { type StockLevel, type StockMovement, type Warehouse, gaanugu } from '../api/types'
import { useList, View, availableUnits } from '../api/list'

export function TransferScreen() {
  const stock = useList<StockLevel>('/stock-levels?size=500')
  const movements = useList<StockMovement>('/stock-movements?size=500')
  const warehouses = useList<Warehouse>('/warehouses?size=500')
  const [form, setForm] = useState({ stockLevelId: '', toWarehouseId: '', quantity: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const from = stock.data?.find((s) => String(s.id) === form.stockLevelId)
  const to = warehouses.data?.find((w) => String(w.id) === form.toWarehouseId)
  const transfers = useMemo(
    () => movements.data?.filter((m) => m.type.startsWith('TRANSFER')).slice(0, 12) ?? null,
    [movements.data])
  const valid = form.stockLevelId && form.toWarehouseId && form.stockLevelId !== form.toWarehouseId && Number(form.quantity) > 0
  const doPost = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.post('/stock/transfers', {
        stockLevelId: Number(form.stockLevelId), toWarehouseId: Number(form.toWarehouseId),
        quantity: Number(form.quantity), reason: form.reason.trim() || null,
      })
      toast('success', 'Transfer posted')
      setConfirming(false)
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
              {stock.data?.map((s) => <option key={s.id} value={s.id}>{s.variant?.sku} · {s.warehouse?.name} · avail {availableUnits(s, true)}</option>)}
            </select>
          </Field>
          <Field label="To warehouse">
            <select className="input" style={{ width: '100%' }} value={form.toWarehouseId} onChange={(e) => setForm((f) => ({ ...f, toWarehouseId: e.target.value }))}>
              <option value="">Select…</option>
              {warehouses.data?.filter((w) => w.id !== from?.warehouse?.id).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Quantity"><input className="input" type="number" min="1" max={from ? availableUnits(from, true) : undefined} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /></Field>
            <Field label="Reason"><input className="input" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Dispatch to fulfilment hub" style={{ minWidth: 240 }} /></Field>
          </div>
          {stock.loading && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Loading stock positions…</p>}
          {stock.error && <OptionsError onRetry={() => { stock.reload(); warehouses.reload() }} />}
          {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
          <div>
            <Button variant="gold" disabled={!valid || busy || stock.loading} onClick={() => setConfirming(true)}>{busy ? 'Posting…' : 'Post transfer'}</Button>
          </div>
        </div>
      </div>
      <ConfirmModal open={confirming}
        title="Post transfer"
        sub={from && to ? `Move ${form.quantity} units of ${from.variant?.sku} from ${from.warehouse?.name} to ${to.name}? This writes a permanent ledger entry.` : undefined}
        confirmLabel="Post transfer" busy={busy}
        onClose={() => setConfirming(false)} onConfirm={doPost} />
      <div className="card" style={{ marginTop: 22 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Recent transfers
        </div>
        <View loading={movements.loading} error={movements.error} rows={transfers as never[] | null} empty="No transfers yet." onRetry={movements.reload}
          cols={[
            { key: 'movedAt', label: 'When', render: (m: StockMovement) => formatDate(m.movedAt) },
            { key: 'type', label: 'Type', render: (m: StockMovement) => <Pill tone={m.type === 'TRANSFER_IN' ? 'green' : 'gold'}>{m.type.replace(/_/g, ' ')}</Pill> },
            { key: 'sku', label: 'SKU', render: (m: StockMovement) => m.variant?.sku },
            { key: 'fromTo', label: 'From → To', render: (m: StockMovement) => `${m.fromWarehouse?.name ?? '—'} → ${m.toWarehouse?.name ?? '—'}` },
            { key: 'quantity', label: 'Qty', numeric: true },
            { key: 'referenceId', label: 'Ref' },
          ] as never} />
      </div>
    </section>
  )
}
