import { useState, type FormEvent } from 'react'
import { useCart } from '../context/CartContext'
import { shopApi, type CheckoutDetails } from '../api/shopApi'

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpayCheckout(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const inr = (v: number) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

type Step = 'details' | 'pay' | 'done'

const FIELDS: { key: keyof CheckoutDetails; label: string; placeholder: string; inputMode?: 'tel' | 'numeric'; maxLength?: number }[] = [
  { key: 'customerName', label: 'Full name', placeholder: 'Sita Raman' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com' },
  { key: 'phone', label: 'Phone', placeholder: '98765 43210', inputMode: 'tel', maxLength: 14 },
  { key: 'address', label: 'Address', placeholder: 'Flat / street / landmark' },
  { key: 'city', label: 'City', placeholder: 'Vijayawada' },
  { key: 'state', label: 'State', placeholder: 'Andhra Pradesh' },
  { key: 'pincode', label: 'Pincode', placeholder: '520001', inputMode: 'numeric', maxLength: 6 },
]

/** Checkout: address form → demo payment → confirmation with order code. */
export default function CheckoutView() {
  const { cart, placeOrder, payOrder, lastOrder, setLastOrder, setView, showToast } = useCart()
  const [step, setStep] = useState<Step>('details')
  const [form, setForm] = useState<CheckoutDetails>({
    customerName: '', email: '', phone: '', address: '', city: '', state: '', pincode: '',
  })
  const [placing, setPlacing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  const phoneDigits = form.phone.replace(/\D/g, '')
  const phoneValid = /^[6-9]\d{9}$/.test(phoneDigits)
  const phoneError = phoneDigits.length > 0 && !phoneValid

  const valid =
    form.customerName.trim().length >= 2 &&
    /.+@.+\..+/.test(form.email) &&
    phoneValid &&
    form.address.trim().length >= 5 &&
    form.city.trim().length >= 2 &&
    form.state.trim().length >= 2 &&
    /^\d{6}$/.test(form.pincode)

  const submitDetails = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || placing) return
    setPlacing(true)
    setError('')
    placeOrder(form)
      .then(() => setStep('pay'))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Checkout failed'))
      .finally(() => setPlacing(false))
  }

  const pay = () => {
    if (!lastOrder || paying) return
    if (lastOrder.checkout?.provider === 'RAZORPAY') return payWithRazorpay()
    setPaying(true)
    setError('')
    payOrder(lastOrder.orderCode)
      .then(() => setStep('done'))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Payment failed'))
      .finally(() => setPaying(false))
  }

  const payWithRazorpay = () => {
    const checkout = lastOrder?.checkout
    if (!checkout || !lastOrder) return
    setPaying(true)
    setError('')
    const pendingNotice = `We received your payment but confirmation is taking longer than usual. If this doesn't resolve shortly, contact support quoting order ${checkout.orderCode}.`
    loadRazorpayCheckout().then(loaded => {
      if (!loaded || !window.Razorpay) {
        setPaying(false)
        setError('Could not load the payment gateway — check your connection and try again.')
        return
      }
      const rzp = new window.Razorpay({
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amountPaise,
        currency: checkout.currency,
        name: 'Feld·n·Stein',
        description: `Order ${checkout.orderCode}`,
        theme: { color: '#184e32' },
        prefill: { name: form.customerName, email: form.email, contact: form.phone },
        handler: (response: Record<string, string>) => {
          shopApi
            .verifyPayment(checkout.orderCode, response.razorpay_payment_id, response.razorpay_signature)
            .then(paid => {
              setLastOrder(paid)
              setStep('done')
            })
            .catch(() => {
              shopApi
                .track(checkout.orderCode, form.email)
                .then(order => {
                  if (order.status === 'PAID') {
                    setLastOrder(order)
                    setStep('done')
                  } else {
                    setError(pendingNotice)
                  }
                })
                .catch(() => setError(pendingNotice))
            })
            .finally(() => setPaying(false))
        },
        modal: {
          ondismiss: () => {
            setPaying(false)
            setError(`Payment cancelled — order ${checkout.orderCode} is still pending. You can retry payment below.`)
          },
        },
      })
      rzp.open()
    })
  }

  if (step === 'done' && lastOrder) {
    return (
      <section className="min-h-[70vh] flex items-center justify-center px-4 py-16" data-testid="order-confirmation">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-brand-border shadow-xl p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-brand-forest">check_circle</span>
          <h1 className="font-serif text-2xl font-bold text-brand-forest mt-3">Order placed — thank you!</h1>
          <p className="text-sm text-brand-charcoal/70 mt-2">
            Your order <strong data-testid="order-code">{lastOrder.orderCode}</strong> is confirmed.
            We press, pack and ship from Mothadaka — track it any time with your code and email.
          </p>
          <div className="mt-5 bg-brand-cream rounded-xl p-4 text-left text-sm flex flex-col gap-1">
            {lastOrder.lines.map(l => (
              <div key={l.variantId} className="flex justify-between">
                <span>{l.product} · {l.sizeMl} ml × {l.qty}</span>
                <span>{inr(l.lineTotal)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-brand-forest border-t border-brand-border pt-2 mt-1">
              <span>Paid ({lastOrder.payment?.provider ?? 'demo'})</span>
              <span>{inr(lastOrder.grandTotal)}</span>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button className="btn btn-ghost flex-1" onClick={() => setView('track')}>Track order</button>
            <button className="btn btn-primary flex-1" onClick={() => setView('home')}>Continue shopping</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-[70vh] px-4 py-16" data-testid="checkout">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-forest">Checkout</h1>
          <p className="text-sm text-brand-charcoal/60 mt-1">Guest checkout — no account needed.</p>

          {step === 'details' && (
            <form className="mt-6 flex flex-col gap-4" onSubmit={submitDetails}>
              {FIELDS.map(f => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-charcoal/60">{f.label}</span>
                  <input
                    className="input"
                    data-testid={`field-${f.key}`}
                    placeholder={f.placeholder}
                    inputMode={f.inputMode}
                    maxLength={f.maxLength}
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                  {f.key === 'phone' && phoneError && (
                    <p className="text-xs text-red-700" data-testid="field-phone-error">Enter a valid 10-digit Indian mobile number.</p>
                  )}
                </label>
              ))}
              {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
              <button className="btn btn-primary w-full" data-testid="place-order-btn" disabled={!valid || placing || cart.lines.length === 0}>
                {placing ? 'Placing order…' : cart.lines.length === 0 ? 'Your cart is empty' : `Place order · ${inr(cart.grandTotal)}`}
              </button>
            </form>
          )}

          {step === 'pay' && lastOrder && (
            <div className="mt-6 bg-white rounded-2xl border border-brand-border p-6" data-testid="payment-step">
              <h2 className="font-serif text-xl font-bold text-brand-forest">Payment</h2>
              <p className="text-sm text-brand-charcoal/70 mt-2">
                Order <strong>{lastOrder.orderCode}</strong> · {inr(lastOrder.grandTotal)} incl. GST.
              </p>
              <div className="mt-4 bg-brand-cream rounded-xl p-4 text-xs text-brand-charcoal/70 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">lock</span>
                {lastOrder.checkout?.provider === 'RAZORPAY'
                  ? 'Secure payment via Razorpay — UPI, cards and netbanking supported.'
                  : 'Demo gateway — no real money moves. Razorpay goes live with one config change.'}
              </div>
              {error && <p className="text-sm text-red-700 mt-3" role="alert">{error}</p>}
              <button className="btn btn-primary w-full mt-5" data-testid="pay-btn" disabled={paying} onClick={pay}>
                {paying ? 'Processing…' : lastOrder.checkout?.provider === 'RAZORPAY'
                  ? `Pay ${inr(lastOrder.grandTotal)} securely`
                  : `Pay ${inr(lastOrder.grandTotal)}`}
              </button>
            </div>
          )}
        </div>

        <aside className="bg-white rounded-2xl border border-brand-border p-6 h-fit">
          <h2 className="font-serif text-lg font-bold text-brand-forest">Order summary</h2>
          <div className="mt-4 flex flex-col gap-3">
            {cart.lines.map(l => (
              <div key={l.variantId} className="flex justify-between text-sm">
                <span>{l.product} · {l.sizeMl} ml × {l.qty}</span>
                <span>{inr(l.lineTotal)}</span>
              </div>
            ))}
            {cart.lines.length === 0 && (
              <p className="text-sm text-brand-charcoal/50">Your cart is empty.</p>
            )}
          </div>
          <div className="border-t border-brand-border mt-4 pt-3 flex flex-col gap-1 text-sm text-brand-charcoal/70">
            <div className="flex justify-between"><span>Subtotal</span><span>{inr(cart.subTotal)}</span></div>
            <div className="flex justify-between"><span>GST</span><span>{inr(cart.gstTotal)}</span></div>
            <div className="flex justify-between font-serif text-base font-bold text-brand-forest">
              <span>Total</span><span>{inr(cart.grandTotal)}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
