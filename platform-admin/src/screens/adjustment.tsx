import { useState, useMemo } from 'react'
import { Button, ConfirmModal, Field, OptionsError, Pill, useToast } from '../ui'
import { formatDate } from '../api/formats'
import { type StockLevel, type StockMovement, gaanugu } from '../api/types'
import { useList, View } from '../api/list'

const ADJ_TYPES = ['DAMAGE', 'SPOILAGE', 'EXPIRY', 'THEFT', 'COUNT']



export function AdjustmentScreen() {
  const stock = useList<StockLevel>('/stock-levels?size=500')
  const movements = useList<StockMovement>('/stock-movements?size=500')
  const [form, setForm] = useState({ stockLevelId: '', adjustedQty: '', type: 'DAMAGE', reason: '' })
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const selected = stock.data?.find((s) => String(s.id) === form.stockLevelId)
  const delta = selected && form.adjustedQty !== '' ? Number(form.adjustedQty) - selected.onHand : null
  const adjustments = useMemo(
    () => movements.data?.filter((m) => m.type.startsWith('ADJUSTMENT')).slice(0, 12) ?? null,
    [movements.data])
  const valid = form.stockLevelId && form.adjustedQty !== '' && Number(form.adjustedQty) >= 0
  const doPost = async () => {
    setBusy(true); setError(null)
    try {
      const res = await gaanugu.post<{ delta: number }>('/stock/adjustments', {
        stockLevelId: Number(form.stockLevelId), adjustedQty: Number(form.adjustedQty),
        type: form.type, reason: form.reason.trim() || null,
      })
      toast('success', `Adjustment posted (delta ${res.delta > 0 ? '+' : ''}${res.delta})`)
      setConfirming(false)
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
          {stock.loading && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Loading stock positions…</p>}
          {stock.error && <OptionsError onRetry={() => stock.reload()} />}
          {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
          <div>
            <Button variant="gold" disabled={!valid || busy || stock.loading} onClick={() => setConfirming(true)}>{busy ? 'Posting…' : 'Post adjustment'}</Button>
          </div>
        </div>
      </div>
      <ConfirmModal open={confirming}
        title="Post adjustment"
        sub={selected && delta !== null ? `Set ${selected.variant?.sku} at ${selected.warehouse?.name} to ${form.adjustedQty} units (delta ${delta > 0 ? '+' : ''}${delta})? This writes a permanent ledger entry and cannot be undone.` : undefined}
        confirmLabel="Post adjustment" busy={busy}
        onClose={() => setConfirming(false)} onConfirm={doPost} />
      <div className="card" style={{ marginTop: 22 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Recent adjustments
        </div>
        <View loading={movements.loading} error={movements.error} rows={adjustments as never[] | null} empty="No adjustments yet." onRetry={movements.reload}
          cols={[
            { key: 'movedAt', label: 'When', render: (m: StockMovement) => formatDate(m.movedAt) },
            { key: 'type', label: 'Type', render: (m: StockMovement) => <Pill tone={m.type === 'ADJUSTMENT_IN' ? 'green' : 'rust'}>{m.type.replace(/_/g, ' ')}</Pill> },
            { key: 'sku', label: 'SKU', render: (m: StockMovement) => m.variant?.sku },
            { key: 'quantity', label: 'Qty', numeric: true },
            { key: 'reason', label: 'Reason' },
            { key: 'referenceId', label: 'Ref' },
          ] as never} />
      </div>
    </section>
  )
}
