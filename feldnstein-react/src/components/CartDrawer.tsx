import { useCart } from '../context/CartContext'

const inr = (v: number) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/** Slide-over cart: line items with quantity steppers, GST math, checkout CTA. */
export default function CartDrawer() {
  const { cart, drawerOpen, setDrawerOpen, setQty, removeItem, setView } = useCart()

  const startCheckout = () => {
    setDrawerOpen(false)
    setView('checkout')
  }

  return (
    <div
      className={`fixed inset-0 z-[70] transition-opacity ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!drawerOpen}
    >
      <div className="absolute inset-0 bg-brand-forest/50" onClick={() => setDrawerOpen(false)} />
      <aside
        data-testid="cart-drawer"
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-brand-cream shadow-2xl flex flex-col transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-brand-border">
          <h2 className="font-serif text-xl font-bold text-brand-forest">Your Cart</h2>
          <button className="btn btn-ghost !p-2" aria-label="Close cart" onClick={() => setDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {cart.lines.length === 0 && (
            <p className="text-sm text-brand-charcoal/60 text-center py-10" data-testid="cart-empty">
              Your cart is empty — the press is waiting.
            </p>
          )}
          {cart.lines.map(line => (
            <div key={line.variantId} className="flex gap-3 bg-white rounded-xl border border-brand-border p-3" data-testid="cart-line">
              <div className="flex-1 min-w-0">
                <p className="font-serif font-semibold text-brand-forest text-sm truncate">{line.product}</p>
                <p className="text-[11px] text-brand-charcoal/60">{line.sku} · {line.sizeMl} ml</p>
                <p className="text-xs font-bold text-brand-forest mt-1">{inr(line.unitPrice)}</p>
                {line.available < line.qty && (
                  <p className="text-[11px] text-red-700 mt-1">Only {line.available} left in stock</p>
                )}
              </div>
              <div className="flex flex-col items-end justify-between">
                <div className="flex items-center gap-2">
                  <button
                    className="w-7 h-7 rounded-full border border-brand-border text-brand-forest font-bold"
                    aria-label="Decrease quantity"
                    onClick={() => setQty(line.variantId, line.qty - 1)}
                  >−</button>
                  <span className="w-6 text-center text-sm font-bold">{line.qty}</span>
                  <button
                    className="w-7 h-7 rounded-full border border-brand-border text-brand-forest font-bold"
                    aria-label="Increase quantity"
                    onClick={() => setQty(line.variantId, line.qty + 1)}
                  >+</button>
                </div>
                <div className="flex items-center gap-3">
                  <strong className="text-sm text-brand-forest">{inr(line.lineTotal)}</strong>
                  <button className="text-brand-charcoal/40 hover:text-red-700" aria-label="Remove item" onClick={() => removeItem(line.variantId)}>
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {cart.lines.length > 0 && (
          <footer className="border-t border-brand-border px-6 py-5 flex flex-col gap-2 bg-white">
            <div className="flex justify-between text-sm text-brand-charcoal/70">
              <span>Subtotal</span><span>{inr(cart.subTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-brand-charcoal/70">
              <span>GST</span><span>{inr(cart.gstTotal)}</span>
            </div>
            <div className="flex justify-between font-serif text-lg font-bold text-brand-forest">
              <span>Total</span><span>{inr(cart.grandTotal)}</span>
            </div>
            <button className="btn btn-primary w-full mt-2" data-testid="cart-checkout-btn" onClick={startCheckout}>
              Checkout · {inr(cart.grandTotal)}
            </button>
            <p className="text-[10px] text-center text-brand-charcoal/50 mt-1">
              Stock is reserved for your order once you check out.
            </p>
          </footer>
        )}
      </aside>
    </div>
  )
}
