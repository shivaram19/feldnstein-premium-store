import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  api,
  formatDate,
  formatINR,
  type AnalyticsSummary,
  type LoyaltyAccount,
  type LoyaltyTransaction,
  type Product,
  type PurchaseOrder,
  type StockMovement,
} from './api'
import {
  Button, DataTable, EmptyState, ErrorState, Field, LoadingRows, Kpi, Modal, Pill,
  useToast,
  type Column,
} from './ui'

/* ---------- shared data hook ---------- */
function useList<T>(path: string) {
  const [data, setData] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .list<T>(path)
      .then((rows) => !cancelled && setData(rows))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [path])
  useEffect(() => reload(), [reload])
  return { data, error, loading, reload }
}

function View({ loading, error, rows, cols, empty, rowClass, onRetry }: {
  loading: boolean
  error: string | null
  rows: unknown[] | null
  cols: Column<never>[]
  empty: string
  rowClass?: (row: never) => string | undefined
  onRetry: () => void
}) {
  if (loading) return <LoadingRows cols={cols.length} />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (!rows || rows.length === 0) return <EmptyState title={empty} />
  return <DataTable columns={cols} rows={rows as never[]} rowClass={rowClass} />
}

const LOW_STOCK_THRESHOLD = 10

/* ================= PRODUCTS ================= */
export function ProductsTab() {
  const { data, error, loading, reload } = useList<Product>('/products')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const toast = useToast()

  const filtered = useMemo(() => {
    if (!data) return null
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  }, [data, search])

  const lowStock = data?.filter((p) => p.stockQty < LOW_STOCK_THRESHOLD).length ?? 0

  return (
    <section>
      <div className="toolbar">
        <input className="input" placeholder="Search name, SKU, category…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {lowStock > 0 && <Pill tone="rust">{lowStock} low stock</Pill>}
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Add product</Button>
      </div>
      <div className="card">
        <View
          loading={loading} error={error} rows={filtered as never[] | null}
          empty="No products yet." onRetry={reload}
          rowClass={((p: Product) => (p.stockQty < LOW_STOCK_THRESHOLD ? 'row-low-stock' : undefined)) as never}
          cols={[
            { key: 'name', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'category', label: 'Category', render: (p: Product) => <Pill tone="forest">{p.category}</Pill> },
            { key: 'price', label: 'Price', numeric: true, render: (p: Product) => formatINR(p.price) },
            { key: 'stockQty', label: 'Stock', numeric: true, render: (p: Product) =>
              <Pill tone={p.stockQty < LOW_STOCK_THRESHOLD ? 'rust' : 'green'}>{p.stockQty} units</Pill> },
          ] as never}
        />
      </div>
      <ProductModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Product created'); reload() }} />
    </section>
  )
}

function ProductModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', sku: '', category: '', price: '', stockQty: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const valid = form.name.trim() && form.sku.trim() && Number(form.price) >= 0 && Number(form.stockQty) >= 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await api.create('/products', { name: form.name.trim(), sku: form.sku.trim(), category: form.category.trim() || 'General', price: Number(form.price), stockQty: Number(form.stockQty) || 0 })
      setForm({ name: '', sku: '', category: '', price: '', stockQty: '' })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Add product" sub="Creates a new catalog item with its opening stock." open={open} onClose={onClose}>
      <Field label="Name"><input className="input" style={{ width: '100%' }} value={form.name} onChange={set('name')} autoFocus /></Field>
      <Field label="SKU"><input className="input" style={{ width: '100%' }} value={form.sku} onChange={set('sku')} placeholder="e.g. OIL-CO-250" /></Field>
      <Field label="Category"><input className="input" style={{ width: '100%' }} value={form.category} onChange={set('category')} placeholder="e.g. Cold-Pressed Oils" /></Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Price (₹)"><input className="input" type="number" min="0" style={{ width: '100%' }} value={form.price} onChange={set('price')} /></Field>
        <Field label="Opening stock"><input className="input" type="number" min="0" style={{ width: '100%' }} value={form.stockQty} onChange={set('stockQty')} /></Field>
      </div>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Create product'}</Button>
      </div>
    </Modal>
  )
}

/* ================= STOCK MOVEMENTS ================= */
export function StockMovementsTab() {
  const { data, error, loading, reload } = useList<StockMovement>('/stock-movements')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const productName = (id: number) => id
  void productName
  return (
    <section>
      <div className="toolbar">
        <Pill tone="green">IN = received</Pill><Pill tone="rust">OUT = issued / sold</Pill><Pill tone="gold">ADJUST = correction</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Post movement</Button>
      </div>
      <div className="card">
        <View
          loading={loading} error={error} rows={data as never[] | null}
          empty="No stock movements yet." onRetry={reload}
          cols={[
            { key: 'createdAt', label: 'When', render: (m: StockMovement) => formatDate(m.createdAt) },
            { key: 'productId', label: 'Product ID', numeric: true },
            { key: 'type', label: 'Type', render: (m: StockMovement) =>
              <Pill tone={m.type === 'IN' ? 'green' : m.type === 'OUT' ? 'rust' : 'gold'}>{m.type}</Pill> },
            { key: 'quantity', label: 'Qty', numeric: true, render: (m: StockMovement) =>
              <span style={{ color: m.type === 'OUT' ? 'var(--rust)' : 'var(--herb)', fontWeight: 700 }}>
                {m.type === 'OUT' ? '−' : '+'}{m.quantity}
              </span> },
            { key: 'reason', label: 'Reason' },
          ] as never}
        />
      </div>
      <MovementModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Movement posted'); reload() }} />
    </section>
  )
}

function MovementModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({ productId: '', type: 'IN', quantity: '1', reason: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (open) api.list<Product>('/products').then(setProducts).catch(() => setProducts([])) }, [open])
  const valid = form.productId && Number(form.quantity) > 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await api.create('/stock-movements', { productId: Number(form.productId), type: form.type, quantity: Number(form.quantity), reason: form.reason.trim() || form.type })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Post stock movement" sub="Records a batch into, out of, or adjustment to inventory." open={open} onClose={onClose}>
      <Field label="Product">
        <select className="input" style={{ width: '100%' }} value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
          <option value="">Select a product…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Type">
          <select className="input" style={{ width: '100%' }} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option>IN</option><option>OUT</option><option>ADJUST</option>
          </select>
        </Field>
        <Field label="Quantity"><input className="input" type="number" min="1" style={{ width: '100%' }} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /></Field>
      </div>
      <Field label="Reason"><input className="input" style={{ width: '100%' }} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Batch FW-12 received from mill" /></Field>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Posting…' : 'Post movement'}</Button>
      </div>
    </Modal>
  )
}

/* ================= ORDERS ================= */
const ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'CANCELLED'] as const
const statusTone = (s: string) => (s === 'PAID' ? 'green' : s === 'SHIPPED' ? 'forest' : s === 'CANCELLED' ? 'rust' : 'gold')

export function OrdersTab() {
  const { data, error, loading, reload } = useList<PurchaseOrder>('/purchase-orders')
  const [filter, setFilter] = useState<string>('ALL')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const filtered = useMemo(() => {
    if (!data) return null
    return filter === 'ALL' ? data : data.filter((o) => o.status === filter)
  }, [data, filter])
  const count = (s: string) => data?.filter((o) => o.status === s).length ?? 0
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          <Pill tone={filter === 'ALL' ? 'forest' : 'plain'} selected={filter === 'ALL'} onClick={() => setFilter('ALL')}>All · {data?.length ?? 0}</Pill>
          {ORDER_STATUSES.map((s) => (
            <Pill key={s} tone={statusTone(s)} selected={filter === s} onClick={() => setFilter(s)}>{s} · {count(s)}</Pill>
          ))}
        </div>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ New order</Button>
      </div>
      <div className="card">
        <View
          loading={loading} error={error} rows={filtered as never[] | null}
          empty={filter === 'ALL' ? 'No orders yet.' : `No ${filter.toLowerCase()} orders.`} onRetry={reload}
          cols={[
            { key: 'id', label: 'Order #', numeric: true },
            { key: 'customerEmail', label: 'Customer' },
            { key: 'status', label: 'Status', render: (o: PurchaseOrder) => <Pill tone={statusTone(o.status)}>{o.status}</Pill> },
            { key: 'totalAmount', label: 'Total', numeric: true, render: (o: PurchaseOrder) => formatINR(o.totalAmount) },
            { key: 'createdAt', label: 'Placed', render: (o: PurchaseOrder) => formatDate(o.createdAt) },
          ] as never}
        />
      </div>
      <OrderModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Order created'); reload() }} />
    </section>
  )
}

function OrderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ customerEmail: '', totalAmount: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = /.+@.+\..+/.test(form.customerEmail) && Number(form.totalAmount) > 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await api.create('/purchase-orders', { customerEmail: form.customerEmail.trim(), status: 'PENDING', totalAmount: Number(form.totalAmount) })
      setForm({ customerEmail: '', totalAmount: '' })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="New order" sub="Creates a pending order (payment flow is a later epic)." open={open} onClose={onClose}>
      <Field label="Customer email"><input className="input" style={{ width: '100%' }} type="email" value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} autoFocus /></Field>
      <Field label="Order total (₹)"><input className="input" style={{ width: '100%' }} type="number" min="1" value={form.totalAmount} onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))} /></Field>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Create order'}</Button>
      </div>
    </Modal>
  )
}

/* ================= LOYALTY ================= */
const tierTone = (t: string) => (t === 'GOLD' ? 'gold' : t === 'SILVER' ? 'slate' : 'forest')

export function LoyaltyTab() {
  const { data, error, loading, reload } = useList<LoyaltyAccount>('/loyalty-accounts')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const totalPoints = data?.reduce((s, a) => s + a.pointsBalance, 0) ?? 0
  return (
    <section>
      <div className="toolbar">
        <Pill tone="forest">{data?.length ?? 0} members</Pill>
        <Pill tone="gold">{totalPoints.toLocaleString('en-IN')} points outstanding</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Add member</Button>
      </div>
      <div className="card">
        <View
          loading={loading} error={error} rows={data as never[] | null}
          empty="No loyalty members yet." onRetry={reload}
          cols={[
            { key: 'name', label: 'Member' },
            { key: 'memberEmail', label: 'Email' },
            { key: 'tier', label: 'Tier', render: (a: LoyaltyAccount) => <Pill tone={tierTone(a.tier)}>{a.tier}</Pill> },
            { key: 'pointsBalance', label: 'Points', numeric: true, render: (a: LoyaltyAccount) =>
              <strong style={{ color: 'var(--deep)' }}>{a.pointsBalance.toLocaleString('en-IN')}</strong> },
          ] as never}
        />
      </div>
      <MemberModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Member added'); reload() }} />
    </section>
  )
}

function MemberModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', memberEmail: '', tier: 'BRONZE' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = form.name.trim() && /.+@.+\..+/.test(form.memberEmail)
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await api.create('/loyalty-accounts', { name: form.name.trim(), memberEmail: form.memberEmail.trim(), tier: form.tier, pointsBalance: 0 })
      setForm({ name: '', memberEmail: '', tier: 'BRONZE' })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Add loyalty member" sub="Enrols a customer into the points programme." open={open} onClose={onClose}>
      <Field label="Name"><input className="input" style={{ width: '100%' }} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus /></Field>
      <Field label="Email"><input className="input" style={{ width: '100%' }} type="email" value={form.memberEmail} onChange={(e) => setForm((f) => ({ ...f, memberEmail: e.target.value }))} /></Field>
      <Field label="Tier">
        <select className="input" style={{ width: '100%' }} value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}>
          <option>BRONZE</option><option>SILVER</option><option>GOLD</option>
        </select>
      </Field>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Add member'}</Button>
      </div>
    </Modal>
  )
}

/* ================= POINTS LEDGER ================= */
export function PointsLedgerTab() {
  const { data, error, loading, reload } = useList<LoyaltyTransaction>('/loyalty-transactions')
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([])
  useEffect(() => { api.list<LoyaltyAccount>('/loyalty-accounts').then(setAccounts).catch(() => undefined) }, [])
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const memberName = (id: number) => accounts.find((a) => a.id === id)?.name ?? `#${id}`
  return (
    <section>
      <div className="toolbar">
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Post points</Button>
      </div>
      <div className="card">
        <View
          loading={loading} error={error} rows={data as never[] | null}
          empty="No points activity yet." onRetry={reload}
          cols={[
            { key: 'createdAt', label: 'When', render: (t: LoyaltyTransaction) => formatDate(t.createdAt) },
            { key: 'accountId', label: 'Member', render: (t: LoyaltyTransaction) => memberName(t.accountId) },
            { key: 'delta', label: 'Points', numeric: true, render: (t: LoyaltyTransaction) =>
              <Pill tone={t.delta >= 0 ? 'green' : 'rust'}>{t.delta >= 0 ? '+' : ''}{t.delta}</Pill> },
            { key: 'reason', label: 'Reason' },
          ] as never}
        />
      </div>
      <PointsModal open={open} accounts={accounts} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Points posted'); reload() }} />
    </section>
  )
}

function PointsModal({ open, accounts, onClose, onCreated }: { open: boolean; accounts: LoyaltyAccount[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ accountId: '', delta: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!open) setForm({ accountId: '', delta: '', reason: '' }) }, [open])
  const valid = form.accountId && Number(form.delta) !== 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await api.create('/loyalty-transactions', { accountId: Number(form.accountId), delta: Number(form.delta), reason: form.reason.trim() || 'Adjustment' })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Post points" sub="Positive delta awards points; negative redeems them." open={open} onClose={onClose}>
      <Field label="Member">
        <select className="input" style={{ width: '100%' }} value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}>
          <option value="">Select a member…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.pointsBalance} pts)</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Delta (+/−)"><input className="input" type="number" style={{ width: '100%' }} value={form.delta} onChange={(e) => setForm((f) => ({ ...f, delta: e.target.value }))} placeholder="e.g. 100 or −50" /></Field>
      </div>
      <Field label="Reason"><input className="input" style={{ width: '100%' }} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Order #12 award" /></Field>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Posting…' : 'Post points'}</Button>
      </div>
    </Modal>
  )
}

/* ================= ANALYTICS ================= */
export function AnalyticsTab() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const load = useCallback(() => {
    setLoading(true); setError(null); setForbidden(false)
    api.get<AnalyticsSummary>('/analytics/summary')
      .then(setSummary)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.startsWith('403')) setForbidden(true)
        else setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  if (forbidden) {
    return (
      <div className="card">
        <EmptyState title="Analytics is ADMIN-only" hint="You are signed in with the OPERATOR role — analytics is restricted to administrators (ADR-0005). Sign in as admin to view." />
      </div>
    )
  }
  if (loading) return <div className="card"><LoadingRows cols={3} /></div>
  if (error) return <div className="card"><ErrorState message={error} onRetry={load} /></div>
  if (!summary) return null
  return (
    <section>
      <div className="kpi-grid">
        <Kpi dark label="Revenue (paid)" value={formatINR(summary.revenuePaid)} />
        <Kpi label="Orders" value={summary.orderCount} />
        <Kpi label="Products" value={summary.productCount} />
        <Kpi label="Stock units" value={summary.totalStockUnits.toLocaleString('en-IN')} />
        <Kpi label="Loyalty members" value={summary.loyaltyMembers} />
        <Kpi label="Points outstanding" value={summary.pointsOutstanding.toLocaleString('en-IN')} />
      </div>
      <div className="toolbar">
        <span className="page-sub" style={{ margin: 0 }}>Aggregates across all domains — same numbers the dashboard endpoints serve.</span>
        <div className="spacer" />
        <Button variant="ghost" small onClick={load}>Refresh</Button>
      </div>
    </section>
  )
}
