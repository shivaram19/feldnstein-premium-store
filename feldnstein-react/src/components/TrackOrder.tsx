import { useState, type FormEvent } from 'react'
import { useCart } from '../context/CartContext'
import { shopApi, type LoyaltyBalance, type Order } from '../api/shopApi'

const STEPS = ['PENDING', 'PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const
const LABELS: Record<string, string> = {
  PENDING: 'Order received', PAID: 'Payment confirmed', CONFIRMED: 'Packed at the unit',
  SHIPPED: 'On the way', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
}

/** Order tracking: order code + email → status timeline. */
export default function TrackOrder() {
  const { setView } = useCart()
  const [orderCode, setOrderCode] = useState('')
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [loyalty, setLoyalty] = useState<LoyaltyBalance | null>(null)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)

  const lookup = (e: FormEvent) => {
    e.preventDefault()
    if (searching) return
    setSearching(true)
    setError('')
    setLoyalty(null)
    shopApi
      .track(orderCode.trim(), email.trim())
      .then(found => {
        setOrder(found)
        if (found.status === 'DELIVERED') {
          shopApi
            .loyaltyBalance(found.email, found.orderCode)
            .then(setLoyalty)
            .catch(() => setLoyalty(null))
        }
      })
      .catch((err: unknown) => {
        setOrder(null)
        setError(err instanceof Error ? err.message : 'Lookup failed')
      })
      .finally(() => setSearching(false))
  }

  const done = order ? STEPS.filter(s => order.timeline[s]) : []
  const cancelled = order?.status === 'CANCELLED'

  return (
    <section className="min-h-[70vh] px-4 py-16" data-testid="track-order">
      <div className="max-w-xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-brand-forest">Track your order</h1>
        <p className="text-sm text-brand-charcoal/60 mt-1">Enter the order code from your confirmation and your email.</p>
        <form className="mt-6 flex flex-col gap-3" onSubmit={lookup}>
          <input className="input" data-testid="track-code" placeholder="Order code — e.g. ORD-1793…" value={orderCode} onChange={e => setOrderCode(e.target.value)} />
          <input className="input" data-testid="track-email" placeholder="Email used at checkout" value={email} onChange={e => setEmail(e.target.value)} />
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <button className="btn btn-primary" data-testid="track-btn" disabled={!orderCode.trim() || !email.trim() || searching}>
            {searching ? 'Looking up…' : 'Track'}
          </button>
        </form>

        {order && (
          <div className="mt-8 bg-white rounded-2xl border border-brand-border p-6" data-testid="track-result">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-lg font-bold text-brand-forest">{order.orderCode}</h2>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${cancelled ? 'bg-red-100 text-red-800' : 'bg-brand-forest/10 text-brand-forest'}`}>
                {LABELS[order.status] ?? order.status}
              </span>
            </div>
            <p className="text-xs text-brand-charcoal/60 mt-1">
              {order.lines.reduce((a, l) => a + l.qty, 0)} items · {order.customerName}
            </p>
            {cancelled && order.cancelReason && (
              <p className="text-sm text-red-700 mt-3">Reason: {order.cancelReason}</p>
            )}
            {loyalty && (
              <p className="text-xs text-brand-charcoal/70 mt-3" data-testid="loyalty-balance">
                Rewards balance: {loyalty.balance} points (lifetime earned {loyalty.lifetimeEarned})
              </p>
            )}
            <ol className="mt-6 flex flex-col gap-0">
              {(cancelled ? ['CANCELLED'] : [...STEPS]).map((s, i) => {
                const reached = cancelled || i < done.length
                const when = order.timeline[s]
                return (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-4 h-4 rounded-full ${reached ? (cancelled ? 'bg-red-700' : 'bg-brand-forest') : 'bg-brand-border'}`} />
                      {i < (cancelled ? 0 : STEPS.length - 1) && <span className={`w-0.5 flex-1 min-h-[18px] ${i < done.length - 1 || cancelled ? 'bg-brand-forest' : 'bg-brand-border'}`} />}
                    </div>
                    <div className="pb-5">
                      <p className={`text-sm font-bold ${reached ? 'text-brand-forest' : 'text-brand-charcoal/40'}`}>{LABELS[s]}</p>
                      {when && <p className="text-[11px] text-brand-charcoal/50">{new Date(when).toLocaleString('en-IN')}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        <p className="mt-8 text-center">
          <button className="btn btn-ghost" onClick={() => setView('home')}>← Back to the store</button>
        </p>
      </div>
    </section>
  )
}
