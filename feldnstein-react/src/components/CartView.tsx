import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'
import { assetUrl, FREE_SHIPPING_THRESHOLD } from '../api/shopApi'
import { products } from '../data/products'

const inr = (v: number) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const FALLBACK_IMG = assetUrl('/assets/img/img-02.jpg')

/** Kitchen-truth complement pairs (ADR-0030 move 4): what this oil is cooked alongside. */
const COMPLEMENT: Record<string, string> = {
  groundnut: 'sesame',
  sesame: 'coconut',
  coconut: 'groundnut',
  sunflower: 'groundnut',
}

function complementFor(cartProductNames: string[]) {
  for (const name of cartProductNames) {
    const n = name.toLowerCase()
    for (const [key, comp] of Object.entries(COMPLEMENT)) {
      if (n.includes(key)) {
        const found = products.find(p => p.id === comp)
        const variant = found?.sizes?.[0] ?? found?.variants?.[0]
        if (found && variant) return { product: found, variant }
      }
    }
  }
  return null
}

interface SiteProduct {
  id: number
  name?: string
  imageUrl?: string
  imageThumbUrl?: string
}

/** Full-page cart (e-commerce norm, ADR-0022): review the whole basket before checkout. */
export default function CartView() {
  const { cart, loading, setQty, removeItem, setView, addToCart, showToast } = useCart()
  const [images, setImages] = useState<Record<number, string>>({})

  const complement = loading ? null : complementFor(cart.lines.map(l => l.product))
  const shippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cart.subTotal)
  const shippingProgress = Math.min(100, Math.round((cart.subTotal / FREE_SHIPPING_THRESHOLD) * 100))

  const addComplement = () => {
    if (!complement) return
    addToCart(complement.variant.variantId, complement.product.name, complement.variant.price, complement.variant.sizeMl)
    showToast(`${complement.product.name} added — a natural pair in the kitchen`)
  }

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
            {cart.lines.map(line => (              <div key={line.variantId} className="flex gap-4 bg-white rounded-2xl border border-brand-border p-4" data-testid="cart-page-line">
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
            {complement && !cart.lines.some(l => l.product === complement.product.name) && (
              <div className="rounded-2xl border border-dashed border-brand-ochre/50 bg-brand-warmCard/50 p-4" data-testid="cart-cross-sell">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-charcoal/60">Pairs in your kitchen</p>
                <div className="mt-2 flex items-center gap-4">
                  <img src={complement.product.img} alt={complement.product.name} className="w-16 h-16 rounded-xl object-cover border border-brand-border/60" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-semibold text-sm text-brand-forest">{complement.product.name}</p>
                    <p className="text-xs text-brand-charcoal/60">{complement.variant.label} · {inr(complement.variant.price)}</p>
                  </div>
                  <button className="btn btn-gold !py-2 !px-4 text-xs shrink-0" data-testid="cross-sell-add" onClick={addComplement}>
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="bg-brand-cream rounded-2xl border border-brand-border p-6 lg:sticky lg:top-24" data-testid="cart-page-summary">
            <h2 className="font-serif text-lg font-bold text-brand-forest">Order Summary</h2>
            <div className="mt-4" data-testid="shipping-progress">
              {shippingRemaining > 0 ? (
                <>
                  <p className="text-xs text-brand-charcoal/70">
                    Add <strong>{inr(shippingRemaining)}</strong> more for free shipping
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-brand-border overflow-hidden">
                    <div className="h-full rounded-full bg-brand-ochre transition-all" style={{ width: `${shippingProgress}%` }}></div>
                  </div>
                </>
              ) : (
                <p className="text-xs font-bold text-brand-forest inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">local_shipping</span>
                  Free shipping unlocked — pressed to order in 48 hours
                </p>
              )}
            </div>
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
