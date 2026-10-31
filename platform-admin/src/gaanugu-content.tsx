import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { gaanugu, type GOilProduct } from './gaanugu-api'
import { Button, Field, LoadingRows, Pill, useToast } from './ui'

/* ================= SITE CONTENT ================= */
const TABS = ['Hero', 'Banner', 'Testimonials', 'Ticker', 'Products'] as const

export function GSiteContent() {
  const [sub, setSub] = useState<(typeof TABS)[number]>('Hero')
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          {TABS.map((t) => (
            <Pill key={t} tone={sub === t ? 'forest' : 'plain'} selected={sub === t} onClick={() => setSub(t)}>{t}</Pill>
          ))}
        </div>
      </div>
      {sub === 'Hero' && <HeroEditor />}
      {sub === 'Banner' && <BannerEditor />}
      {sub === 'Testimonials' && <TestimonialsEditor />}
      {sub === 'Ticker' && <TickerEditor />}
      {sub === 'Products' && <ProductsEditor />}
    </section>
  )
}

/* ---- shared: load/save a JSON content block ---- */
function useBlock(key: string) {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const load = useCallback(() => {
    setLoading(true)
    api.get<{ payload: Record<string, unknown> }>(`/g/site-content/${encodeURIComponent(key)}`)
      .then((b) => setPayload(b.payload ?? {}))
      .catch(() => setPayload({}))
      .finally(() => setLoading(false))
  }, [key])
  useEffect(load, [load])
  const save = async (next: Record<string, unknown>) => {
    try {
      await api.update(`/g/site-content/${encodeURIComponent(key)}`, { payload: JSON.stringify(next) })
      toast('success', 'Saved')
      setPayload(next)
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) }
  }
  return { payload, loading, save }
}

function BlockCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 16, maxWidth: 860, marginBottom: 22 }}>
      <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

/* ---- published assets for pickers ---- */
interface PublishedAsset { id: number; assetKey: string; variants: Record<string, string> }

function usePublishedAssets() {
  const [assets, setAssets] = useState<PublishedAsset[]>([])
  useEffect(() => {
    api.list<PublishedAsset & { status: string }>('/g/media')
      .then((rows) => setAssets(rows.filter((r) => r.status === 'PUBLISHED')))
      .catch(() => undefined)
  }, [])
  return assets
}

function AssetPicker({ label, value, onChange, variant }: {
  label: string; value: string; onChange: (url: string) => void; variant: string
}) {
  const assets = usePublishedAssets()
  return (
    <Field label={label}>
      <select className="input" style={{ width: '100%' }}
        value={assets.find((a) => a.variants[variant] === value)?.assetKey ?? ''}
        onChange={(e) => {
          const a = assets.find((x) => x.assetKey === e.target.value)
          onChange(a?.variants[variant] ?? '')
        }}>
        <option value="">— none —</option>
        {assets.map((a) => <option key={a.assetKey} value={a.assetKey}>{a.assetKey}</option>)}
      </select>
    </Field>
  )
}

/* ---- Hero ---- */
function HeroEditor() {
  const { payload, loading, save } = useBlock('hero:main')
  const [form, setForm] = useState({ headline: '', subcopy: '', imageUrl: '' })
  useEffect(() => { if (payload) setForm({
    headline: String(payload.headline ?? ''), subcopy: String(payload.subcopy ?? ''), imageUrl: String(payload.imageUrl ?? ''),
  }) }, [payload])
  if (loading || !payload) return <LoadingRows cols={3} />
  return (
    <BlockCard title="Homepage hero">
      <AssetPicker label="Hero image (16:9)" value={form.imageUrl} variant="hero"
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
      {form.imageUrl && <img src={form.imageUrl} alt="hero preview" style={{ width: '100%', maxWidth: 480, borderRadius: 6, marginBottom: 12 }} />}
      <Field label="Headline"><input className="input" style={{ width: '100%' }} value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} /></Field>
      <Field label="Subcopy"><input className="input" style={{ width: '100%' }} value={form.subcopy} onChange={(e) => setForm((f) => ({ ...f, subcopy: e.target.value }))} /></Field>
      <Button variant="gold" disabled={!form.headline} onClick={() => save({ ...form })}>Save hero</Button>
    </BlockCard>
  )
}

/* ---- Banner ---- */
function BannerEditor() {
  const { payload, loading, save } = useBlock('banner:main')
  const [form, setForm] = useState({ heading: '', imageUrl: '', link: '' })
  useEffect(() => { if (payload) setForm({
    heading: String(payload.heading ?? ''), imageUrl: String(payload.imageUrl ?? ''), link: String(payload.link ?? ''),
  }) }, [payload])
  if (loading || !payload) return <LoadingRows cols={3} />
  return (
    <BlockCard title="Collection banner (21:9)">
      <AssetPicker label="Banner image" value={form.imageUrl} variant="banner"
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
      <Field label="Heading"><input className="input" style={{ width: '100%' }} value={form.heading} onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))} /></Field>
      <Field label="Link (optional)"><input className="input" style={{ width: '100%' }} value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="/#collection" /></Field>
      <Button variant="gold" disabled={!form.heading} onClick={() => save({ ...form })}>Save banner</Button>
    </BlockCard>
  )
}

/* ---- Testimonials ---- */
interface TestimonialItem { quote: string; author: string; location: string }

function TestimonialsEditor() {
  const { payload, loading, save } = useBlock('testimonials')
  const [items, setItems] = useState<TestimonialItem[]>([])
  useEffect(() => { if (payload) setItems((payload.items as TestimonialItem[]) ?? []) }, [payload])
  if (loading || !payload) return <LoadingRows cols={3} />
  const set = (i: number, patch: Partial<TestimonialItem>) =>
    setItems((arr) => arr.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  return (
    <BlockCard title="Testimonials">
      {items.map((it, i) => (
        <div key={i} style={{ border: '1px solid var(--hairline)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <Field label="Quote"><input className="input" style={{ width: '100%' }} value={it.quote} onChange={(e) => set(i, { quote: e.target.value })} /></Field>
          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Author"><input className="input" value={it.author} onChange={(e) => set(i, { author: e.target.value })} /></Field>
            <Field label="Location"><input className="input" value={it.location} onChange={(e) => set(i, { location: e.target.value })} /></Field>
          </div>
          <Button variant="ghost" small onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}>Remove</Button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="ghost" small onClick={() => setItems((arr) => [...arr, { quote: '', author: '', location: '' }])}>+ Add testimonial</Button>
        <Button variant="gold" disabled={items.some((i) => !i.quote || !i.author)} onClick={() => save({ items })}>Save testimonials</Button>
      </div>
    </BlockCard>
  )
}

/* ---- Ticker ---- */
function TickerEditor() {
  const { payload, loading, save } = useBlock('ticker:items')
  const [items, setItems] = useState<string[]>([])
  useEffect(() => { if (payload) setItems((payload.items as string[]) ?? []) }, [payload])
  if (loading || !payload) return <LoadingRows cols={2} />
  return (
    <BlockCard title="Ticker headlines">
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input className="input" style={{ flex: 1 }} value={it} onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button variant="ghost" small onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}>✕</Button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="ghost" small onClick={() => setItems((arr) => [...arr, ''])}>+ Add line</Button>
        <Button variant="gold" disabled={items.some((i) => !i.trim())} onClick={() => save({ items })}>Save ticker</Button>
      </div>
    </BlockCard>
  )
}

/* ---- Products (marketing per oil) ---- */
interface Mkt { badge: string; shortDesc: string; longDesc: string; cardAssetId: number | null }

function ProductsEditor() {
  const [prods, setProds] = useState<GOilProduct[] | null>(null)
  const [mkt, setMkt] = useState<Record<number, Mkt>>({})
  const [assets, setAssets] = useState<(PublishedAsset & { status: string })[]>([])
  const toast = useToast()
  useEffect(() => {
    gaanugu.list<GOilProduct>('/oil-products?size=500').then(setProds).catch(() => undefined)
    api.list<PublishedAsset & { status: string }>('/g/media').then(setAssets).catch(() => undefined)
    api.list<{ productId: number; badge?: string; shortDesc?: string; longDesc?: string; cardAssetId?: number }>('/g/site-content/product-marketing')
      .then((rows) => setMkt(Object.fromEntries(rows.map((r) => [r.productId, {
        badge: r.badge ?? '', shortDesc: r.shortDesc ?? '', longDesc: r.longDesc ?? '', cardAssetId: r.cardAssetId ?? null,
      }]))))
      .catch(() => undefined)
  }, [])
  const save = async (p: GOilProduct) => {
    const f = mkt[p.id] ?? { badge: '', shortDesc: '', longDesc: '', cardAssetId: null }
    try {
      await api.update(`/g/site-content/product-marketing/${p.id}`, {
        badge: f.badge || null, shortDesc: f.shortDesc || null, longDesc: f.longDesc || null, cardAssetId: f.cardAssetId,
      })
      toast('success', `${p.name} marketing saved`)
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) }
  }
  if (!prods) return <LoadingRows cols={4} />
  const cardAssets = assets.filter((a) => a.status === 'PUBLISHED')
  return (
    <>
      {prods.filter((p) => p.active).map((p) => {
        const f = mkt[p.id] ?? { badge: '', shortDesc: '', longDesc: '', cardAssetId: null }
        const set = (patch: Partial<Mkt>) => setMkt((m) => ({ ...m, [p.id]: { ...f, ...patch } }))
        const chosen = cardAssets.find((a) => a.id === f.cardAssetId)
        return (
          <BlockCard key={p.id} title={p.name}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 160 }}>
                {chosen?.variants.thumb
                  ? <img src={chosen.variants.thumb} alt={p.name} style={{ width: '100%', borderRadius: 6, aspectRatio: '4 / 5', objectFit: 'cover' }} />
                  : <div style={{ aspectRatio: '4 / 5', borderRadius: 6, background: 'var(--cream)', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 11, textAlign: 'center', padding: 8 }}>no card image — storefront uses its default</div>}
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <Field label="Card image (4:5)">
                  <select className="input" style={{ width: '100%' }} value={f.cardAssetId ?? ''} onChange={(e) => set({ cardAssetId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">— none —</option>
                    {cardAssets.map((a) => <option key={a.id} value={a.id}>{a.assetKey}</option>)}
                  </select>
                </Field>
                <Field label="Badge"><input className="input" style={{ width: '100%' }} value={f.badge} onChange={(e) => set({ badge: e.target.value })} placeholder="Single-Origin Harvest" /></Field>
                <Field label="Short description"><input className="input" style={{ width: '100%' }} value={f.shortDesc} onChange={(e) => set({ shortDesc: e.target.value })} /></Field>
                <Field label="Long description"><textarea className="input" style={{ width: '100%', minHeight: 80 }} value={f.longDesc} onChange={(e) => set({ longDesc: e.target.value })} /></Field>
                <Button variant="gold" onClick={() => save(p)}>Save</Button>
              </div>
            </div>
          </BlockCard>
        )
      })}
    </>
  )
}
