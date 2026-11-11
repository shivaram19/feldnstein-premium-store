import { useState, useEffect, useMemo } from 'react'
import { Button, ConfirmModal, EmptyState, ErrorState, Field, Kpi, LoadingRows, Modal, OptionsError, Pill, useToast } from '../ui'
import { formatINR, formatDay, formatPaise } from '../api/formats'
import { type OilProductRef, type ProductVariant, type PriceConfig, gaanugu } from '../api/types'
import { useList, View } from '../api/list'
import {
  economics, type ByproductSale, type EconomicsParams, type EconomicsVariant,
  type ProductEconomics, type SensitivityRow,
} from '../api/economics'
import { PanelTitle } from './shared'

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
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
      <UnitEconomics priceConfigs={data ?? []} onPricesChanged={reload} />
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

/* ================= UNIT ECONOMICS (ADR-0020) ================= */

/** API percentages are fractions (0.46 = 46%) — render ×100 with 1 dp. */
const pct1 = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`

type ParamKey = keyof EconomicsParams
type ParamDraft = Record<ParamKey, string>

const PARAM_FIELDS: { key: ParamKey; label: string; step: number; width: number }[] = [
  { key: 'tripsPerDay', label: 'Pressing trips / day', step: 0.5, width: 130 },
  { key: 'outputPct', label: 'Oil output % of seed', step: 1, width: 130 },
  { key: 'rawMaterialKgPerTrip', label: 'Raw material kg / trip', step: 1, width: 140 },
  { key: 'dailyWages', label: 'Daily wages (₹)', step: 10, width: 130 },
  { key: 'wageDaysPerYear', label: 'Wage days / yr', step: 1, width: 110 },
  { key: 'yearlyFodder', label: 'Yearly fodder (₹)', step: 500, width: 140 },
  { key: 'bottlesPerLitre', label: 'Bottles / litre', step: 0.1, width: 110 },
  { key: 'bottleCostPaise', label: 'Bottle cost (paise)', step: 10, width: 130 },
  { key: 'shopAllocationPerYear', label: 'Shop allocation / yr (₹)', step: 500, width: 160 },
  { key: 'setupCost', label: 'Setup cost (₹)', step: 1000, width: 140 },
  { key: 'depreciationYears', label: 'Depreciation years', step: 1, width: 120 },
]

const toDraft = (p: EconomicsParams): ParamDraft => ({
  tripsPerDay: String(p.tripsPerDay),
  outputPct: String(p.outputPct),
  rawMaterialKgPerTrip: String(p.rawMaterialKgPerTrip),
  materialCostPerKgOverride: p.materialCostPerKgOverride === null ? '' : String(p.materialCostPerKgOverride),
  dailyWages: String(p.dailyWages),
  wageDaysPerYear: String(p.wageDaysPerYear),
  yearlyFodder: String(p.yearlyFodder),
  bottlesPerLitre: String(p.bottlesPerLitre),
  bottleCostPaise: String(p.bottleCostPaise),
  shopAllocationPerYear: String(p.shopAllocationPerYear),
  setupCost: String(p.setupCost),
  depreciationYears: String(p.depreciationYears),
})

const draftValid = (d: ParamDraft): boolean =>
  (Object.keys(d) as ParamKey[]).every((k) =>
    k === 'materialCostPerKgOverride' || (d[k] !== '' && !isNaN(Number(d[k]))))

/** Blank parameters draft — shown when no economics config exists for the selected oil yet. */
const EMPTY_DRAFT: ParamDraft = {
  tripsPerDay: '', outputPct: '', rawMaterialKgPerTrip: '', materialCostPerKgOverride: '',
  dailyWages: '', wageDaysPerYear: '', yearlyFodder: '', bottlesPerLitre: '',
  bottleCostPaise: '', shopAllocationPerYear: '', setupCost: '', depreciationYears: '',
}

function UnitEconomics({ priceConfigs, onPricesChanged }: { priceConfigs: PriceConfig[]; onPricesChanged: () => void }) {
  const products = useList<OilProductRef>('/oil-products?size=500')
  const snaps = useList<ProductEconomics>('/economics/products')
  const toast = useToast()
  const [productId, setProductId] = useState<number | null>(null)
  const [draft, setDraft] = useState<ParamDraft | null>(null)
  const [rule, setRule] = useState<{ target: string; min: string } | null>(null)
  const [sens, setSens] = useState<SensitivityRow[] | null>(null)
  const [sensError, setSensError] = useState(false)
  const [applyFor, setApplyFor] = useState<EconomicsVariant | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (productId === null && snaps.data && snaps.data.length > 0) setProductId(snaps.data[0].productId)
  }, [productId, snaps.data])

  const snap = snaps.data?.find((s) => s.productId === productId) ?? null
  const productName = (id: number) => products.data?.find((p) => p.id === id)?.name ?? `Product #${id}`

  useEffect(() => {
    if (!snap) {
      setSens(null)
      if (productId !== null) {
        setDraft(EMPTY_DRAFT)
        setRule({ target: '20', min: '10' })
      } else {
        setDraft(null); setRule(null)
      }
      return
    }
    setDraft(toDraft(snap.params))
    setRule(snap.priceRule
      ? { target: String(snap.priceRule.targetMarginPct * 100), min: String(snap.priceRule.minMarginPct * 100) }
      : { target: '20', min: '10' })
  }, [snap, productId])

  useEffect(() => {
    if (!snap) return
    setSens(null); setSensError(false)
    economics.sensitivity(snap.productId).then(setSens).catch(() => setSensError(true))
  }, [snap])

  const saveParams = async () => {
    const pid = snap?.productId ?? productId
    if (pid === null || !draft) return
    setBusy(true)
    try {
      await economics.saveParams(pid, {
        tripsPerDay: Number(draft.tripsPerDay),
        outputPct: Number(draft.outputPct),
        rawMaterialKgPerTrip: Number(draft.rawMaterialKgPerTrip),
        materialCostPerKgOverride: draft.materialCostPerKgOverride === '' ? null : Number(draft.materialCostPerKgOverride),
        dailyWages: Number(draft.dailyWages),
        wageDaysPerYear: Number(draft.wageDaysPerYear),
        yearlyFodder: Number(draft.yearlyFodder),
        bottlesPerLitre: Number(draft.bottlesPerLitre),
        bottleCostPaise: Number(draft.bottleCostPaise),
        shopAllocationPerYear: Number(draft.shopAllocationPerYear),
        setupCost: Number(draft.setupCost),
        depreciationYears: Number(draft.depreciationYears),
      })
      toast('success', `Economics saved for ${productName(pid)}`)
      snaps.reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  const saveRule = async () => {
    if (!snap || !rule) return
    setBusy(true)
    try {
      await economics.savePriceRule(snap.productId, {
        targetMarginPct: Number(rule.target) / 100,
        minMarginPct: Number(rule.min) / 100,
      })
      toast('success', 'Pricing rule saved')
      snaps.reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  const applySuggested = async () => {
    if (!applyFor || !snap) return
    setBusy(true)
    try {
      const active = priceConfigs.find((c) => c.variant?.id === applyFor.variantId && c.priceType === 'SELLING' && c.active)
      const amount = Math.round((snap.suggestedPricePaise * applyFor.sizeMl / 100000) * 100) / 100
      await gaanugu.create('/price-configs?size=500', {
        variant: { id: applyFor.variantId }, priceType: 'SELLING', amount,
        gstPct: active?.gstPct ?? 5,
        effectiveFrom: new Date().toISOString().slice(0, 10), active: true,
        notes: 'Applied from economics engine suggestion (ADR-0020)',
      })
      toast('success', `New selling price set for ${applyFor.sku}`)
      setApplyFor(null)
      onPricesChanged()
      snaps.reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  const marginTone = (m: number): 'green' | 'gold' | 'rust' => {
    const target = snap?.priceRule?.targetMarginPct ?? 0.2
    const min = snap?.priceRule?.minMarginPct ?? 0.1
    return m >= target ? 'green' : m >= min ? 'gold' : 'rust'
  }

  const ruleValid = !!rule && rule.target !== '' && rule.min !== '' && !isNaN(Number(rule.target)) && !isNaN(Number(rule.min))

  const paramsPanel = draft && (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>PARAMETERS</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Material cost ₹/kg (override)">
          <input className="input" type="number" min="0" step="0.5" style={{ width: 140 }}
            value={draft.materialCostPerKgOverride}
            onChange={(e) => setDraft((d) => d && { ...d, materialCostPerKgOverride: e.target.value })} />
        </Field>
        {PARAM_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input className="input" type="number" step={f.step} style={{ width: f.width }}
              value={draft[f.key]}
              onChange={(e) => setDraft((d) => d && { ...d, [f.key]: e.target.value })} />
          </Field>
        ))}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted)' }}>
        {snap
          ? snap.materialSource === 'OVERRIDE'
            ? 'Manual material-cost override in effect.'
            : snap.materialCostPerKg !== null
              ? `Using procurement avg ${formatINR(snap.materialCostPerKg)}/kg (PROCUREMENT) — clear the override to keep following the feed.`
              : 'No material cost available yet — set the override or record procurement.'
          : 'No economics configured for this oil — set the parameters and save. The engine computes absorption, suggested and floor prices from them.'}
      </p>
      <div style={{ marginTop: 10 }}>
        <Button variant="gold" small disabled={!draftValid(draft) || busy} onClick={saveParams}>
          {busy ? 'Saving…' : 'Save parameters'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="card" data-testid="unit-economics">
      <PanelTitle action={<Button variant="ghost" small onClick={snaps.reload}>Refresh</Button>}>
        Unit economics &amp; margin rules (ADR-0020)
      </PanelTitle>
      <div style={{ padding: '12px 16px 0' }}>
        <Field label="Oil">
          <select className="input" style={{ width: 280 }} value={productId ?? ''}
            onChange={(e) => setProductId(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="">Select oil…</option>
            {(products.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>
      {snaps.loading && <LoadingRows cols={4} />}
      {!snaps.loading && snaps.error && <ErrorState message={snaps.error} onRetry={snaps.reload} />}
      {!snaps.loading && !snaps.error && productId !== null && !snap && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 16px 16px' }}>
          <EmptyState title={`No economics configured for ${productName(productId)} yet.`}
            hint="Set the parameters below and save — the engine computes costs, suggested and floor prices from them. Nothing is fabricated until you save." />
          {paramsPanel}
        </div>
      )}
      {!snaps.loading && !snaps.error && productId === null && (
        <EmptyState title="No economics snapshots yet." />
      )}
      {snap && draft && rule && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 16px 16px' }}>
          {/* parameters */}
          {paramsPanel}

          {/* computed panel */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
              COMPUTED — {productName(snap.productId)} · {snap.yearlyProductionLitres.toLocaleString('en-IN')} L/yr · computed {formatDay(snap.computedAt)}
            </div>
            <div className="kpi-grid">
              <Kpi label="Absorption /L (incl. setup)" value={formatPaise(snap.absorptionInclSetupPaise)} />
              <Kpi label="Absorption /L (excl. setup)" value={formatPaise(snap.absorptionExclSetupPaise)} />
              <Kpi label="Oil-cake credit /L" value={<span style={{ color: 'var(--muted)' }}>{formatPaise(snap.cakeCreditPerLitrePaise)}</span>} />
              <Kpi dark label="Net cost /L" value={<strong>{formatPaise(snap.netCostPaise)}</strong>} />
              <Kpi label="Suggested price /L" value={formatPaise(snap.suggestedPricePaise)} />
              <Kpi label="Floor price /L" value={formatPaise(snap.floorPricePaise)} />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 12 }}>
              <Field label="Target margin %"><input className="input" type="number" min="0" max="95" step="0.5" style={{ width: 110 }}
                value={rule.target} onChange={(e) => setRule((r) => r && { ...r, target: e.target.value })} /></Field>
              <Field label="Min margin %"><input className="input" type="number" min="0" max="95" step="0.5" style={{ width: 110 }}
                value={rule.min} onChange={(e) => setRule((r) => r && { ...r, min: e.target.value })} /></Field>
              <Button variant="gold" small disabled={!ruleValid || busy} onClick={saveRule}>
                {busy ? 'Saving…' : 'Save rule'}
              </Button>
              {!snap.priceRule && <span style={{ fontSize: 12, color: 'var(--muted)' }}>No rule yet — suggested and floor prices use the defaults above until saved.</span>}
            </div>
          </div>

          {/* variants */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
              VARIANTS — margin at current prices
            </div>
            <View loading={false} error={null} rows={snap.variants as never[] | null}
              empty="No sellable variants for this oil."
              onRetry={() => snaps.reload()}
              rowClass={(v: never) => (v as EconomicsVariant).belowFloor ? 'row-low-stock' : undefined}
              cols={[
                { key: 'sku', label: 'SKU', render: (v: EconomicsVariant) => (
                  <span>{v.sku}{v.belowFloor && <> <Pill tone="rust">Below floor</Pill></>}</span>
                ) },
                { key: 'sizeMl', label: 'Size', numeric: true, render: (v: EconomicsVariant) => `${v.sizeMl} ml` },
                { key: 'activePricePaise', label: 'Current price/L', numeric: true, render: (v: EconomicsVariant) => formatPaise(v.pricePerLitrePaise) },
                { key: 'marginAtCurrentPct', label: 'Margin', numeric: true, render: (v: EconomicsVariant) => (
                  <Pill tone={marginTone(v.marginAtCurrentPct)}>{pct1(v.marginAtCurrentPct)}</Pill>
                ) },
                { key: 'apply', label: '', render: (v: EconomicsVariant) => (
                  <Button variant="ghost" small disabled={busy} onClick={() => setApplyFor(v)}>
                    Apply {formatPaise(snap.suggestedPricePaise)}/L
                  </Button>
                ) },
              ] as never} />
          </div>

          {/* sensitivity */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
              MATERIAL COST SENSITIVITY — margin at current prices
            </div>
            {!sens && !sensError && <LoadingRows cols={5} />}
            {sensError && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>Couldn’t load sensitivity — try Refresh.</p>}
            {sens && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sens.map((r) => (
                  <div key={r.materialDeltaPct} style={{
                    flex: '1 1 120px', minWidth: 120, padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${r.materialDeltaPct === 0 ? 'var(--primary)' : 'var(--hairline)'}`,
                    background: r.materialDeltaPct === 0 ? 'rgba(24, 78, 50, 0.06)' : undefined,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.06em' }}>
                      {r.materialDeltaPct > 0 ? '+' : ''}{r.materialDeltaPct}% MATERIAL
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: r.marginAtCurrentPricePct < 0 ? 'var(--rust)' : undefined }}>
                      {pct1(r.marginAtCurrentPricePct)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ByproductPanel productId={snap.productId} onRecorded={() => snaps.reload()} />
        </div>
      )}

      <ConfirmModal open={!!applyFor} busy={busy}
        title={applyFor ? `Apply ${formatPaise(snap?.suggestedPricePaise ?? 0)}/L to ${applyFor.sku}?` : ''}
        sub="This creates a new effective-dated SELLING price config at the suggested per-litre price converted to the variant size (GST unchanged). The old config is preserved as history."
        confirmLabel="Apply suggested price"
        onClose={() => setApplyFor(null)}
        onConfirm={applySuggested} />
    </div>
  )
}

/* ================= byproduct (oil cake) sales ================= */

function ByproductPanel({ productId, onRecorded }: { productId: number; onRecorded: () => void }) {
  const sales = useList<ByproductSale>(`/economics/byproduct-sales?productId=${productId}`)
  const toast = useToast()
  const [form, setForm] = useState({ qtyKg: '', pricePerKg: '', buyer: '', soldAt: '' })
  const [busy, setBusy] = useState(false)
  const valid = (Number(form.qtyKg) || 0) > 0 && form.pricePerKg !== '' && Number(form.pricePerKg) >= 0

  const submit = async () => {
    setBusy(true)
    try {
      await economics.recordByproductSale({
        productId,
        qtyKg: Number(form.qtyKg),
        pricePerKgPaise: Math.round(Number(form.pricePerKg) * 100),
        buyer: form.buyer.trim() || undefined,
        soldAt: form.soldAt || undefined,
      })
      toast('success', 'Oil-cake sale recorded')
      setForm({ qtyKg: '', pricePerKg: '', buyer: '', soldAt: '' })
      sales.reload()
      onRecorded()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  const totalPaise = sales.data?.reduce((n, s) => n + s.qtyKg * s.pricePerKgPaise, 0) ?? 0

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
        OIL-CAKE (BYPRODUCT) SALES
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>
        Oil-cake sale revenue credits against production cost — it lowers the net cost per litre shown above.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <Field label="Qty (kg)"><input className="input" type="number" min="0" step="0.5" style={{ width: 100 }}
          value={form.qtyKg} onChange={(e) => setForm((f) => ({ ...f, qtyKg: e.target.value }))} /></Field>
        <Field label="Price ₹/kg"><input className="input" type="number" min="0" step="0.5" style={{ width: 110 }}
          value={form.pricePerKg} onChange={(e) => setForm((f) => ({ ...f, pricePerKg: e.target.value }))} /></Field>
        <Field label="Buyer (optional)"><input className="input" style={{ width: 180 }}
          value={form.buyer} onChange={(e) => setForm((f) => ({ ...f, buyer: e.target.value }))} /></Field>
        <Field label="Sold on (optional)"><input className="input" type="date" style={{ width: 150 }}
          value={form.soldAt} onChange={(e) => setForm((f) => ({ ...f, soldAt: e.target.value }))} /></Field>
        <Button variant="gold" small disabled={!valid || busy} onClick={submit}>
          {busy ? 'Saving…' : 'Record sale'}
        </Button>
      </div>
      <View loading={sales.loading} error={sales.error} rows={sales.data as never[] | null}
        empty="No oil-cake sales recorded for this oil."
        onRetry={sales.reload}
        cols={[
          { key: 'qtyKg', label: 'Qty (kg)', numeric: true },
          { key: 'pricePerKgPaise', label: 'Price/kg', numeric: true, render: (s: ByproductSale) => formatPaise(s.pricePerKgPaise) },
          { key: 'total', label: 'Total', numeric: true, render: (s: ByproductSale) => formatPaise(s.qtyKg * s.pricePerKgPaise) },
          { key: 'buyer', label: 'Buyer', render: (s: ByproductSale) => s.buyer || '—' },
          { key: 'soldAt', label: 'Sold on', render: (s: ByproductSale) => formatDay(s.soldAt) },
        ] as never} />
      {sales.data && sales.data.length > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700 }}>
          Total revenue {formatPaise(totalPaise)}
        </p>
      )}
    </div>
  )
}
