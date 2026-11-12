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

/** Full-page cart (e-commerce norm, ADR-0022): review the whole basket before checkout. */
export default function CartView() {
  const { cart, loading, setQty, removeItem, setView } = useCart()
  const [images, setImages] = useState<Record<number, string>>({})

  useEffect(() => {
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
  }, [])

  const continueShopping = () => {
    setView('home')
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })),
    )
  }

  if (!loading && cart.lines.length === 0) {
    return (
      <section className="min-h-[60vh] px-4 py-16" data-testid="cart-page">
        <div className="max-w-xl mx-auto flex flex-col items-center text-center gap-4 py-16">
          <span className="material-symbols-outlined text-5xl text-brand-charcoal/25">liquor</span>
          <h1 className="font-serif text-2xl font-bold text-brand-forest">Your cart is empty</h1>
          <p className="text-sm text-brand-charcoal/60">Small-batch pressing means limited bottles per batch — reserve yours.</p>
          <button className="btn btn-primary" onClick={continueShopping}>Browse the Collection</button>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-[70vh] px-4 py-12" data-testid="cart-page">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-brand-forest">Your Cart {cart.itemCount > 0 && <span className="text-base font-sans font-normal text-brand-charcoal/50">({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})</span>}</h1>

        <div className="mt-8 grid lg:grid-cols-[1fr_20rem] gap-8 items-start">
          <div className="flex flex-col gap-4" data-testid="cart-page-lines">
            {cart.lines.map(line => (
              <div key={line.variantId} className="flex gap-4 bg-white rounded-2xl border border-brand-border p-4" data-testid="cart-page-line">
                <img
                  src={(line.productId != null && images[line.productId]) || FALLBACK_IMG}
                  alt={line.product}
                  className="w-20 h-20 rounded-xl object-cover border border-brand-border/60 shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-semibold text-brand-forest">{line.product}</p>
                  <p className="text-xs text-brand-charcoal/60 mt-0.5">{line.sizeMl} ml bottle · {line.sku}</p>
                  <p className="text-sm font-bold text-brand-forest mt-2">{inr(line.unitPrice)} <span className="font-normal text-brand-charcoal/60">+ {line.gstPct}% GST</span></p>
                  {line.available < line.qty && (
                    <p className="text-[11px] text-red-700 mt-1">Only {line.available} left in stock</p>
                  )}
                  <button className="text-xs text-brand-charcoal/40 hover:text-red-700 mt-2 inline-flex items-center gap-1" aria-label="Remove item" onClick={() => removeItem(line.variantId)}>
                    <span className="material-symbols-outlined text-sm">delete</span> Remove
                  </button>
                </div>
                <div className="flex flex-col items-end justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      className="w-8 h-8 rounded-full border border-brand-border text-brand-forest font-bold"
                      aria-label="Decrease quantity"
                      onClick={() => setQty(line.variantId, line.qty - 1)}
                    >−</button>
                    <span className="w-8 text-center font-bold">{line.qty}</span>
                    <button
                      className="w-8 h-8 rounded-full border border-brand-border text-brand-forest font-bold"
                      aria-label="Increase quantity"
                      onClick={() => setQty(line.variantId, line.qty + 1)}
                    >+</button>
                  </div>
                  <strong className="text-brand-forest">{inr(line.lineTotal)}</strong>
                </div>
              </div>
            ))}
          </div>

          <aside className="bg-brand-cream rounded-2xl border border-brand-border p-6 lg:sticky lg:top-24" data-testid="cart-page-summary">
            <h2 className="font-serif text-lg font-bold text-brand-forest">Order Summary</h2>
            <div className="mt-4 flex flex-col gap-2 text-sm text-brand-charcoal/70">
              <div className="flex justify-between"><span>Subtotal</span><span>{inr(cart.subTotal)}</span></div>
              <div className="flex justify-between"><span>GST</span><span>{inr(cart.gstTotal)}</span></div>
              <div className="flex justify-between font-serif text-lg font-bold text-brand-forest pt-2 border-t border-brand-border">
                <span>Total</span><span>{inr(cart.grandTotal)}</span>
              </div>
            </div>
            <button className="btn btn-primary w-full mt-5" data-testid="cart-page-checkout" onClick={() => setView('checkout')}>
              Proceed to Checkout
            </button>
            <button className="text-xs text-brand-charcoal/50 hover:text-brand-forest text-center w-full mt-3" onClick={continueShopping}>
              ← Continue shopping
            </button>
          </aside>
        </div>
      </div>
    </section>
  )
}
