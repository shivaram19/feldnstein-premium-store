import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'
import { assetUrl } from '../api/shopApi'

const inr = (v: number) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const FALLBACK_IMG = assetUrl('/assets/img/img-02.jpg')

interface SiteProduct {
  id: number
  name?: string
  imageUrl?: string
  imageThumbUrl?: string
}

/** Slide-over cart: line items with thumbnails, quantity steppers, GST math, checkout CTA. */
export default function CartDrawer() {
  const { cart, loading, drawerOpen, setDrawerOpen, setQty, removeItem, setView } = useCart()
  const [images, setImages] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!drawerOpen) return
    let cancelled = false
    fetch(`${(import.meta.env.VITE_SITE_API as string | undefined) ?? ''}/site/products`)
      .then(r => (r.ok ? r.json() : []))
      .then((rows: SiteProduct[]) => {
        if (cancelled || !Array.isArray(rows)) return
        const map: Record<number, string> = {}
        rows.forEach(p => {
          const src = p.imageThumbUrl ?? p.imageUrl
          if (src) map[p.id] = /^https?:\/\//i.test(src) ? src : `${(import.meta.env.VITE_SITE_API as string | undefined) ?? ''}${src}`
        })
        setImages(map)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [drawerOpen])

  const startCheckout = () => {
    setDrawerOpen(false)
    setView('checkout')
  }

  const browseCollection = () => {
    setDrawerOpen(false)
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div
      className={`fixed inset-0 z-[70] transition-[opacity,visibility] duration-300 ${drawerOpen ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'}`}
      aria-hidden={!drawerOpen}
    >
      <div className="absolute inset-0 bg-brand-forest/50" onClick={() => setDrawerOpen(false)} />
      <aside
        data-testid="cart-drawer"
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-brand-cream shadow-2xl flex flex-col transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-brand-border">
          <h2 className="font-serif text-xl font-bold text-brand-forest">
            Your Cart {cart.itemCount > 0 && <span className="text-sm font-sans font-normal text-brand-charcoal/50">({cart.itemCount})</span>}
          </h2>
          <button className="btn btn-ghost !p-2" aria-label="Close cart" onClick={() => setDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {loading && cart.lines.length === 0 && (
            <div className="flex flex-col gap-4 py-2" data-testid="cart-loading">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex gap-3 bg-white rounded-xl border border-brand-border p-3 animate-pulse">
                  <div className="w-16 h-16 rounded-lg bg-brand-border shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="h-4 w-2/3 bg-brand-border rounded" />
                    <div className="h-3 w-1/3 bg-brand-border rounded" />
                    <div className="h-3 w-1/4 bg-brand-border rounded" />
                  </div>
                  <div className="h-8 w-20 bg-brand-border rounded" />
                </div>
              ))}
            </div>
          )}
          {!loading && cart.lines.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-16 gap-4" data-testid="cart-empty">
              <span className="material-symbols-outlined text-5xl text-brand-charcoal/25">liquor</span>
              <div>
                <p className="font-serif text-lg font-semibold text-brand-forest">Your cart is empty</p>
                <p className="text-sm text-brand-charcoal/60 mt-1">Small-batch pressing means limited bottles per batch — reserve yours.</p>
              </div>
              <button className="btn btn-primary" onClick={browseCollection}>Browse the Collection</button>
            </div>
          )}
          {cart.lines.map(line => (
            <div key={line.variantId} className="flex gap-3 bg-white rounded-xl border border-brand-border p-3" data-testid="cart-line">
              <img
                src={(line.productId != null && images[line.productId]) || FALLBACK_IMG}
                alt={line.product}
                className="w-16 h-16 rounded-lg object-cover border border-brand-border/60 shrink-0"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="font-serif font-semibold text-brand-forest text-sm truncate">{line.product}</p>
                <p className="text-[11px] text-brand-charcoal/60">{line.sizeMl} ml bottle</p>
                <p className="text-xs font-bold text-brand-forest mt-1">{inr(line.unitPrice)} <span className="font-normal text-brand-charcoal/60">+ {line.gstPct}% GST</span></p>
                {line.available < line.qty && (
                  <p className="text-[11px] text-red-700 mt-1">Only {line.available} left in stock</p>
                )}
                <button className="text-[11px] text-brand-charcoal/40 hover:text-red-700 mt-1 inline-flex items-center gap-0.5" aria-label="Remove item" onClick={() => removeItem(line.variantId)}>
                  <span className="material-symbols-outlined text-sm">delete</span> Remove
                </button>
              </div>
              <div className="flex flex-col items-end justify-between shrink-0">
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
                <strong className="text-sm text-brand-forest">{inr(line.lineTotal)}</strong>
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
              <span>GST ({cart.lines[0] ? cart.lines[0].gstPct : 5}%)</span><span>{inr(cart.gstTotal)}</span>
            </div>
            <div className="flex justify-between font-serif text-lg font-bold text-brand-forest">
              <span>Total</span><span>{inr(cart.grandTotal)}</span>
            </div>
            <button className="btn btn-primary w-full mt-2" data-testid="cart-checkout-btn" onClick={startCheckout}>
              Checkout · {inr(cart.grandTotal)}
            </button>
            <button className="text-xs text-brand-charcoal/50 hover:text-brand-forest text-center mt-1" onClick={browseCollection}>
              or continue browsing
            </button>
          </footer>
        )}
      </aside>
    </div>
  )
}
