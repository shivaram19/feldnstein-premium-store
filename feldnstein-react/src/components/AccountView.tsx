import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'
import { useCustomer } from '../context/CustomerContext'
import { authApi, inr, type Order } from '../api/shopApi'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Received', PAID: 'Paid', CONFIRMED: 'Packed', SHIPPED: 'On the way',
  DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
}

/** Signed-in order history with one-tap reorder (ADR-0023). */
export default function AccountView() {
  const { customer, profile } = useCustomer()
  const { setView, addToCart, setDrawerOpen, showToast } = useCart()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!customer) return
    authApi
      .orders()
      .then(setOrders)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load orders'))
  }, [customer])

  if (!customer) {
    return (
      <section className="min-h-[60vh] px-4 py-16" data-testid="account-page">
        <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-4 py-16">
          <span className="material-symbols-outlined text-5xl text-brand-charcoal/25">lock</span>
          <h1 className="font-serif text-2xl font-bold text-brand-forest">Sign in to see your orders</h1>
          <p className="text-sm text-brand-charcoal/60">Use the person icon in the header — we email you a one-tap link, no password.</p>
        </div>
      </section>
    )
  }

  const reorder = async (order: Order) => {
    for (const line of order.lines) {
      addToCart(line.variantId, line.product, line.unitPrice, line.sizeMl)
    }
    showToast(`Reordered ${order.lines.reduce((a, l) => a + l.qty, 0)} item(s) from ${order.orderCode}`)
    setView('cart')
    setDrawerOpen(true)
  }

  return (
    <section className="min-h-[70vh] px-4 py-12" data-testid="account-page">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-brand-forest">My Orders</h1>
        {profile && (
          <p className="text-sm text-brand-charcoal/60 mt-1">
            {profile.email} · {profile.orderCount} {profile.orderCount === 1 ? 'order' : 'orders'}
            {profile.loyalty ? ` · ${profile.loyalty.balance} loyalty points` : ''}
          </p>
        )}

        {error && <p className="text-sm text-red-700 mt-6" role="alert">{error}</p>}
        {!orders && !error && <p className="text-sm text-brand-charcoal/50 mt-6">Loading…</p>}
        {orders && orders.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl text-brand-charcoal/25">liquor</span>
            <p className="font-serif text-lg font-semibold text-brand-forest">No orders yet</p>
            <button className="btn btn-primary" onClick={() => setView('home')}>Browse the Collection</button>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {(orders ?? []).map(order => (
            <article key={order.orderCode} className="bg-white rounded-2xl border border-brand-border p-5" data-testid="account-order">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h2 className="font-serif text-lg font-bold text-brand-forest">{order.orderCode}</h2>
                <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                  order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-brand-forest/10 text-brand-forest'
                }`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <p className="text-xs text-brand-charcoal/60 mt-1">
                {new Date(order.createdAt).toLocaleDateString('en-IN')} · {order.lines.reduce((a, l) => a + l.qty, 0)} items · {inr(order.grandTotal)}
              </p>
              <ul className="mt-3 flex flex-col gap-1">
                {order.lines.map(line => (
                  <li key={line.variantId} className="text-sm text-brand-charcoal/80">
                    {line.qty} × {line.product} ({line.sizeMl} ml)
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-3">
                <button className="btn btn-primary !py-2 !px-4 text-xs" onClick={() => reorder(order)} data-testid="reorder-btn">
                  Reorder
                </button>
                <button className="btn btn-ghost !py-2 !px-4 text-xs" onClick={() => setView('track')}>Track</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
