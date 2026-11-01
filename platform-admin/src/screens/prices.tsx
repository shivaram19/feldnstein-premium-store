import { useState, useEffect, useMemo } from 'react'
import { Button, Field, Modal, OptionsError, Pill, useToast } from '../ui'
import { formatINR, formatDay } from '../api/formats'
import { type ProductVariant, type PriceConfig, gaanugu } from '../api/types'
import { useList, View } from '../api/list'

const PRICE_TYPES = ['MRP', 'SELLING', 'COST'] as const
const priceTone = (t: string) => (t === 'MRP' ? 'forest' : t === 'SELLING' ? 'green' : 'slate') as never



export function PricesScreen() {
  const { data, error, loading, reload } = useList<PriceConfig>('/price-configs?size=500')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const filtered = useMemo(() => {
    if (!data) return null
    const rows = typeFilter === 'ALL' ? data : data.filter((p) => p.priceType === typeFilter)
    return rows.slice().sort((a, b) => Number(b.active) - Number(a.active))
  }, [data, typeFilter])
  const margin = (p: PriceConfig) => {
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
        <View loading={loading} error={error} rows={filtered as never[] | null}
          empty={typeFilter === 'ALL' ? 'No price configurations yet.' : `No ${typeFilter.toLowerCase()} prices.`}
          onRetry={reload}
          cols={[
            { key: 'sku', label: 'SKU', render: (p: PriceConfig) => p.variant?.sku },
            { key: 'product', label: 'Oil', render: (p: PriceConfig) => p.variant?.product?.name },
            { key: 'priceType', label: 'Type', render: (p: PriceConfig) => <Pill tone={priceTone(p.priceType)}>{p.priceType}</Pill> },
            { key: 'amount', label: 'Amount (ex-GST)', numeric: true, render: (p: PriceConfig) => formatINR(p.amount) },
            { key: 'gst', label: 'GST', numeric: true, render: (p: PriceConfig) => `${p.gstPct}%` },
            { key: 'incl', label: 'Incl. GST', numeric: true, render: (p: PriceConfig) => formatINR(p.amount * (1 + p.gstPct / 100)) },
            { key: 'margin', label: 'Margin', numeric: true, render: (p: PriceConfig) => {
              const m = margin(p)
              return m === null ? '—' : <Pill tone={m >= 20 ? 'green' : m >= 10 ? 'gold' : 'rust'}>{m}%</Pill>
            } },
            { key: 'effectiveFrom', label: 'Effective', render: (p: PriceConfig) => formatDay(p.effectiveFrom) },
            { key: 'active', label: 'Status', render: (p: PriceConfig) => <Pill tone={p.active ? 'green' : 'slate'}>{p.active ? 'ACTIVE' : 'superseded'}</Pill> },
            { key: 'notes', label: 'Notes' },
          ] as never} />
      </div>
      <PriceModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Price set'); reload() }} />
    </section>
  )
}

function PriceModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [form, setForm] = useState({ variantId: '', priceType: 'SELLING', amount: '', gstPct: '5', effectiveFrom: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState(false)
  const loadOptions = () => {
    setOptionsError(false)
    gaanugu.list<ProductVariant>('/product-variants').then(setVariants).catch(() => setOptionsError(true))
  }
  useEffect(() => { if (open) loadOptions() }, [open])
  const valid = form.variantId && Number(form.amount) > 0 && form.effectiveFrom
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/price-configs?size=500', {
        variant: { id: Number(form.variantId) }, priceType: form.priceType,
        amount: Number(form.amount), gstPct: Number(form.gstPct) || 0,
        effectiveFrom: form.effectiveFrom, active: true, notes: form.notes.trim() || null,
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Set price" sub="Creates a new price row — history is preserved." open={open} onClose={onClose}>
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
      {optionsError && <OptionsError onRetry={loadOptions} />}
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Set price'}</Button>
      </div>
    </Modal>
  )
}
