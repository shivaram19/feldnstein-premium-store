import { useState } from 'react'
import { Button, ConfirmModal, Field, Modal, Pill, useToast } from '../ui'
import { type OilProductRef, type ProductVariant, gaanugu } from '../api/types'
import { useList, View } from '../api/list'
import { providerTone, useAiGenerate } from '../api/marketing'

export function ProductsScreen() {
  const { data, error, loading, reload } = useList<OilProductRef>('/oil-products?size=500')
  const variants = useList<ProductVariant>('/product-variants?size=500')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const skuCount = (p: OilProductRef) =>
    variants.data?.filter((v) => v.product?.id === p.id).length ?? p.variants?.length ?? 0
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
            { key: 'code', label: 'Code', render: (p: OilProductRef) => <Pill tone="forest">{p.code}</Pill> },
            { key: 'name', label: 'Oil' },
            { key: 'source', label: 'Source', render: (p: OilProductRef) => <Pill tone="plain">{p.oilSource}</Pill> },
            { key: 'shelf', label: 'Shelf life', render: (p: OilProductRef) => `${p.shelfLifeDays} days` },
            { key: 'variants', label: 'SKUs', numeric: true, render: (p: OilProductRef) => variants.loading ? '…' : skuCount(p) },
          ] as never} />
      </div>
      <NewOilModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Oil created'); reload() }} />
    </section>
  )
}

function NewOilModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ code: '', name: '', oilSource: 'GROUNDNUT', shelfLifeDays: '365', description: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDesc, setPendingDesc] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const ai = useAiGenerate()
  const valid = form.code.trim() && form.name.trim() && Number(form.shelfLifeDays) > 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/oil-products?size=500', { code: form.code.trim(), name: form.name.trim(), oilSource: form.oilSource, shelfLifeDays: Number(form.shelfLifeDays), description: form.description.trim() || null, active: true })
      setForm({ code: '', name: '', oilSource: 'GROUNDNUT', shelfLifeDays: '365', description: '' })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const generateDesc = async () => {
    const res = await ai.run('product-description', {
      productName: form.name.trim() || undefined,
      oilType: form.oilSource,
    })
    if (!res) return
    setProvider(res.provider)
    if (form.description.trim()) setPendingDesc(res.text)
    else setForm((f) => ({ ...f, description: res.text }))
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
      <Field label="Description">
        <textarea className="input" style={{ width: '100%', minHeight: 90 }} value={form.description} placeholder="Marketing copy for the storefront"
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </Field>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <Button variant="ghost" small disabled={ai.busy} onClick={generateDesc}>{ai.busy ? 'Generating…' : '✨ Generate with AI'}</Button>
        {provider && <Pill tone={providerTone(provider)}>{provider}</Pill>}
      </div>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Create oil'}</Button>
      </div>
      <ConfirmModal open={pendingDesc !== null} title="Replace existing description?"
        sub="The AI-generated copy will overwrite the description you already typed."
        confirmLabel="Replace"
        onClose={() => setPendingDesc(null)}
        onConfirm={() => { if (pendingDesc !== null) setForm((f) => ({ ...f, description: pendingDesc })); setPendingDesc(null) }} />
    </Modal>
  )
}
