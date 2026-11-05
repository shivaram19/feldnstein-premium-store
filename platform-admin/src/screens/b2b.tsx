import { useEffect, useState } from 'react'
import { Button, ConfirmModal, Field, Modal, OptionsError, Pill, useToast, type Column } from '../ui'
import { formatDate, formatDay, formatPaise } from '../api/formats'
import { gaanugu, type ProductVariant, type Warehouse } from '../api/types'
import { useList, View } from '../api/list'
import {
  growth, type B2BOrderDetail, type B2BOrderListItem, type B2BOrderStatus,
  type B2BSeller, type B2BOrderLineInput,
} from '../api/growth'
import { PanelTitle } from './shared'

const ORDER_STATUSES = ['DRAFT', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const

function statusTone(s: string): 'green' | 'rust' | 'gold' | 'forest' | 'slate' {
  switch (s) {
    case 'DELIVERED': return 'green'
    case 'DISPATCHED': return 'forest'
    case 'CONFIRMED': return 'gold'
    case 'CANCELLED': return 'rust'
    default: return 'slate'
  }
}

export function B2BScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SellersPanel />
      <OrdersPanel />
    </div>
  )
}

/* ================= sellers ================= */
function SellersPanel() {
  const sellers = useList<B2BSeller>('/b2b/sellers')
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', contactName: '', phone: '', email: '', gst: '', address: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = !!form.code.trim() && !!form.name.trim()

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await growth.createB2BSeller({
        code: form.code.trim(), name: form.name.trim(),
        contactName: form.contactName.trim() || undefined, phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined, gst: form.gst.trim() || undefined,
        address: form.address.trim() || undefined, active: true,
      })
      toast('success', `Seller ${form.code.trim()} added`)
      setOpen(false)
      setForm({ code: '', name: '', contactName: '', phone: '', email: '', gst: '', address: '' })
      sellers.reload()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  const cols: Column<never>[] = [
    { key: 'code', label: 'Code', render: (s: B2BSeller) => <code style={{ fontSize: 12 }}>{s.code}</code> },
    { key: 'name', label: 'Seller' },
    { key: 'contact', label: 'Contact', render: (s: B2BSeller) => (
      <span>{s.contactName || '—'}<br /><small style={{ color: 'var(--muted)' }}>{s.phone || s.email || ''}</small></span>
    ) },
    { key: 'gst', label: 'GST', render: (s: B2BSeller) => s.gst || '—' },
    { key: 'address', label: 'Address', render: (s: B2BSeller) => s.address || '—' },
    { key: 'active', label: 'Status', render: (s: B2BSeller) => <Pill tone={s.active ? 'green' : 'slate'}>{s.active ? 'ACTIVE' : 'inactive'}</Pill> },
  ] as never

  return (
    <div className="card" data-testid="b2b-sellers">
      <PanelTitle action={<Button variant="gold" small onClick={() => setOpen(true)}>+ New seller</Button>}>
        B2B sellers
      </PanelTitle>
      <View loading={sellers.loading} error={sellers.error} rows={sellers.data as never[] | null}
        cols={cols} empty="No wholesale sellers yet — add the first one." onRetry={sellers.reload} />

      <Modal open={open} onClose={() => setOpen(false)} title="New B2B seller"
        sub="The code must be unique — it’s how orders reference the seller.">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Code *"><input className="input" style={{ width: 140 }} value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. S-101" /></Field>
          <Field label="Business name *"><input className="input" style={{ width: 260 }} value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Contact person"><input className="input" style={{ width: 200 }} value={form.contactName}
            onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} /></Field>
          <Field label="Phone"><input className="input" style={{ width: 160 }} value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Email"><input className="input" type="email" style={{ width: 240 }} value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="GSTIN"><input className="input" style={{ width: 180 }} value={form.gst}
            onChange={(e) => setForm((f) => ({ ...f, gst: e.target.value }))} /></Field>
        </div>
        <Field label="Address"><textarea className="input" rows={2} style={{ width: '100%' }} value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></Field>
        {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Add seller'}</Button>
        </div>
      </Modal>
    </div>
  )
}

/* ================= orders ================= */
interface DraftLine { variantId: string; qty: string; unitPrice: string; gstPct: string }

function OrdersPanel() {
  const [status, setStatus] = useState('')
  const orders = useList<B2BOrderListItem>(`/b2b/orders${status ? `?status=${status}` : ''}`)
  const sellers = useList<B2BSeller>('/b2b/sellers')
  const warehouses = useList<Warehouse>('/warehouses?size=500')
  const toast = useToast()
  const [newOpen, setNewOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<B2BOrderDetail | null>(null)
  const [pending, setPending] = useState<{ status: B2BOrderStatus; label: string } | null>(null)
  const [warehouseId, setWarehouseId] = useState('')
  const [busy, setBusy] = useState(false)

  const openDetail = (id: number) => {
    setDetailId(id); setDetail(null); setWarehouseId('')
    growth.b2bOrder(id).then(setDetail).catch((e: unknown) => {
      setDetailId(null)
      toast('error', e instanceof Error ? e.message : 'Couldn’t load this order')
    })
  }

  const runStatus = async () => {
    if (!detailId || !pending) return
    if (pending.status === 'DISPATCHED' && !warehouseId) {
      toast('error', 'Choose the dispatch warehouse first.')
      return
    }
    setBusy(true)
    try {
      const body: { status: B2BOrderStatus; warehouseId?: number } = { status: pending.status }
      if (pending.status === 'DISPATCHED') body.warehouseId = Number(warehouseId)
      const updated = await growth.b2bOrderStatus(detailId, body)
      setDetail(updated)
      toast('success', `Order ${updated.orderNo} → ${updated.status.toLowerCase()}`)
      orders.reload()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Action failed')
    } finally { setBusy(false); setPending(null) }
  }

  const cols: Column<never>[] = [
    { key: 'orderNo', label: 'Order', render: (o: B2BOrderListItem) => (
      <button className="linklike" onClick={() => openDetail(o.id)}>{o.orderNo}</button>
    ) },
    { key: 'seller', label: 'Seller', render: (o: B2BOrderListItem) => (
      <span>{o.sellerName}<br /><small style={{ color: 'var(--muted)' }}>{o.sellerCode}</small></span>
    ) },
    { key: 'lineCount', label: 'Lines', numeric: true },
    { key: 'grandTotalPaise', label: 'Total', numeric: true, render: (o: B2BOrderListItem) => formatPaise(o.grandTotalPaise) },
    { key: 'orderDate', label: 'Ordered', render: (o: B2BOrderListItem) => formatDay(o.orderDate) },
    { key: 'dispatchDate', label: 'Dispatched', render: (o: B2BOrderListItem) => o.dispatchDate ? formatDay(o.dispatchDate) : '—' },
    { key: 'deliveredDate', label: 'Delivered', render: (o: B2BOrderListItem) => o.deliveredDate ? formatDay(o.deliveredDate) : '—' },
    { key: 'status', label: 'Status', render: (o: B2BOrderListItem) => <Pill tone={statusTone(o.status)}>{o.status}</Pill> },
  ] as never

  // allowed transitions per the B2B lifecycle (ADR-0018)
  const nextAction: { status: B2BOrderStatus; label: string } | undefined =
    !detail ? undefined
      : detail.status === 'DRAFT' ? { status: 'CONFIRMED', label: 'Confirm order' }
        : detail.status === 'CONFIRMED' ? { status: 'DISPATCHED', label: 'Dispatch' }
          : detail.status === 'DISPATCHED' ? { status: 'DELIVERED', label: 'Mark delivered' }
            : undefined
  const cancellable = detail && ['DRAFT', 'CONFIRMED'].includes(detail.status)

  return (
    <div className="card" data-testid="b2b-orders">
      <PanelTitle action={<Button variant="gold" small onClick={() => setNewOpen(true)}>+ New order</Button>}>
        Wholesale orders
      </PanelTitle>
      <div className="toolbar" style={{ padding: '10px 16px 0' }}>
        <div className="filter-row">
          {['', ...ORDER_STATUSES].map((s) => (
            <Pill key={s || 'ALL'} tone={status === s ? 'forest' : 'plain'} selected={status === s}
              onClick={() => setStatus(s)}>{s || 'All'}</Pill>
          ))}
        </div>
        <div className="spacer" />
        <Button variant="ghost" small onClick={orders.reload}>Refresh</Button>
      </div>
      <View loading={orders.loading} error={orders.error} rows={orders.data as never[] | null}
        cols={cols} empty={status ? `No ${status.toLowerCase()} wholesale orders.` : 'No wholesale orders yet.'}
        onRetry={orders.reload} />

      <NewOrderModal open={newOpen} onClose={() => setNewOpen(false)}
        sellers={sellers.data ?? []}
        onCreated={() => { setNewOpen(false); orders.reload() }} />

      <Modal open={detailId !== null} onClose={() => setDetailId(null)}
        title={detail ? `Order ${detail.orderNo}` : 'Order'}>
        {!detail ? <p>Loading…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pill tone={statusTone(detail.status)}>{detail.status}</Pill>
              <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{formatPaise(detail.grandTotalPaise)}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              {detail.seller?.name} · {detail.seller?.code}<br />
              {detail.seller?.gst && <>GSTIN {detail.seller.gst} · </>}
              {detail.orderDate && <>ordered {formatDate(detail.orderDate)}</>}
            </p>

            <table className="data">
              <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">GST</th><th className="num">Total</th></tr></thead>
              <tbody>
                {detail.lines.map((l, i) => (
                  <tr key={i}>
                    <td>{l.name ?? l.sku ?? `Variant #${l.variantId}`}<br />
                      <small style={{ color: 'var(--muted)' }}>{l.sku} · {l.variantId}</small></td>
                    <td className="num">{l.qty}</td>
                    <td className="num">{formatPaise(l.unitPricePaise)}</td>
                    <td className="num">{l.gstPct}%</td>
                    <td className="num">{formatPaise(l.lineTotalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginLeft: 'auto', width: 240, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{formatPaise(detail.subTotalPaise)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST</span><span>{formatPaise(detail.gstTotalPaise)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>Grand total</span><span>{formatPaise(detail.grandTotalPaise)}</span>
              </div>
            </div>

            {detail.notes && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Notes: {detail.notes}</p>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {cancellable && (
                <Button variant="ghost" disabled={busy} onClick={() => setPending({ status: 'CANCELLED', label: 'Cancel order' })}>Cancel</Button>
              )}
              {nextAction && (
                <Button variant="gold" disabled={busy} onClick={() => setPending(nextAction)}>{nextAction.label}</Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!pending} busy={busy}
        title={pending?.label ?? ''}
        sub={pending?.status === 'DISPATCHED'
          ? 'Dispatch deducts stock (FEFO) from the chosen warehouse. This cannot be undone.'
          : pending?.status === 'CANCELLED'
            ? `This cancels order ${detail?.orderNo ?? ''}. Cancelled orders cannot be revived.`
            : `This moves order ${detail?.orderNo ?? ''} forward in the wholesale pipeline.`}
        confirmLabel={pending?.label}
        onClose={() => setPending(null)}
        onConfirm={runStatus}>
        {pending?.status === 'DISPATCHED' && (
          <Field label="Dispatch from warehouse *">
            <select className="input" style={{ width: '100%' }} value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">Select warehouse…</option>
              {warehouses.data?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
        )}
      </ConfirmModal>
    </div>
  )
}

/* ================= new order modal ================= */
function NewOrderModal({ open, onClose, sellers, onCreated }: {
  open: boolean; onClose: () => void; sellers: B2BSeller[]; onCreated: () => void
}) {
  const toast = useToast()
  const [sellerId, setSellerId] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([{ variantId: '', qty: '1', unitPrice: '', gstPct: '5' }])
  const [notes, setNotes] = useState('')
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [optionsError, setOptionsError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOptions = () => {
    setOptionsError(false)
    gaanugu.list<ProductVariant>('/product-variants').then(setVariants).catch(() => setOptionsError(true))
  }
  useEffect(() => { if (open) { loadOptions(); setSellerId(''); setNotes(''); setLines([{ variantId: '', qty: '1', unitPrice: '', gstPct: '5' }]) } }, [open])

  const setLine = (i: number, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const totals = lines.reduce((acc, l) => {
    const qty = Number(l.qty) || 0
    const pricePaise = Math.round((Number(l.unitPrice) || 0) * 100)
    const gstPct = Number(l.gstPct) || 0
    const sub = qty * pricePaise
    return { sub: acc.sub + sub, gst: acc.gst + Math.round(sub * gstPct / 100) }
  }, { sub: 0, gst: 0 })

  const valid = !!sellerId && lines.length > 0 && lines.every((l) =>
    !!l.variantId && (Number(l.qty) || 0) > 0 && l.unitPrice !== '' && Number(l.unitPrice) >= 0)

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const body = {
        sellerId: Number(sellerId),
        lines: lines.map((l): B2BOrderLineInput => ({
          variantId: Number(l.variantId), qty: Number(l.qty),
          unitPricePaise: Math.round(Number(l.unitPrice) * 100), gstPct: Number(l.gstPct) || 0,
        })),
        notes: notes.trim() || undefined,
      }
      const order = await growth.createB2BOrder(body)
      toast('success', `${order.orderNo} created as draft`)
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New wholesale order"
      sub="Created as DRAFT — confirm, then dispatch from a warehouse.">
      <Field label="Seller *">
        <select className="input" style={{ width: '100%' }} value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
          <option value="">Select seller…</option>
          {sellers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
        </select>
      </Field>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label={i === 0 ? 'Variant' : ' '}>
              <select className="input" style={{ width: 240 }} value={l.variantId}
                onChange={(e) => setLine(i, { variantId: e.target.value })}>
                <option value="">Select variant…</option>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.sku} ({v.sizeMl} ml)</option>)}
              </select>
            </Field>
            <Field label={i === 0 ? 'Qty' : ' '}>
              <input className="input" type="number" min="1" step="1" style={{ width: 80 }} value={l.qty}
                onChange={(e) => setLine(i, { qty: e.target.value })} />
            </Field>
            <Field label={i === 0 ? 'Unit price (₹)' : ' '}>
              <input className="input" type="number" min="0" step="0.01" style={{ width: 110 }} value={l.unitPrice}
                placeholder="0.00" onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
            </Field>
            <Field label={i === 0 ? 'GST %' : ' '}>
              <input className="input" type="number" min="0" step="0.01" style={{ width: 80 }} value={l.gstPct}
                onChange={(e) => setLine(i, { gstPct: e.target.value })} />
            </Field>
            <Field label={i === 0 ? '' : ' '}>
              <Button variant="ghost" small disabled={lines.length === 1}
                onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Remove</Button>
            </Field>
          </div>
        ))}
        <div>
          <Button variant="ghost" small onClick={() => setLines((ls) => [...ls, { variantId: '', qty: '1', unitPrice: '', gstPct: '5' }])}>
            + Add line
          </Button>
        </div>
      </div>

      <div style={{ marginLeft: 'auto', width: 240, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{formatPaise(totals.sub)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST</span><span>{formatPaise(totals.gst)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
          <span>Grand total</span><span>{formatPaise(totals.sub + totals.gst)}</span>
        </div>
      </div>

      <Field label="Notes"><textarea className="input" rows={2} style={{ width: '100%' }} value={notes}
        onChange={(e) => setNotes(e.target.value)} /></Field>
      {optionsError && <OptionsError onRetry={loadOptions} />}
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Creating…' : 'Create order'}</Button>
      </div>
    </Modal>
  )
}
