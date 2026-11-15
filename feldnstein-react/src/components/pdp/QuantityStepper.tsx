import { useEffect, useState, type RefObject } from 'react'

/**
 * QuantityStepper — BUSINESS JOB: one less reason to hesitate. Stock honesty
 * is the rule: the max is the sellable quantity (capped display at 10), never
 * an invented scarcity counter. Buttons are real buttons with labels; the
 * numeric value stays a live region so screen readers announce changes.
 */
export default function QuantityStepper({ qty, onChange, max = 10 }: {
  qty: number
  onChange: (qty: number) => void
  max?: number
}) {
  const clamp = (v: number) => Math.min(max, Math.max(1, v))
  return (
    <div className="flex items-center rounded-full border border-brand-border bg-white" role="group" aria-label="Quantity">
      <button type="button" onClick={() => onChange(clamp(qty - 1))} disabled={qty <= 1} aria-label="Decrease quantity" className="w-10 h-11 flex items-center justify-center text-brand-forest hover:text-brand-ochreDeep disabled:opacity-30">
        <span className="material-symbols-outlined text-lg">remove</span>
      </button>
      <span id="detailQty" aria-live="polite" className="w-8 text-center font-semibold text-brand-forest">{qty}</span>
      <button type="button" onClick={() => onChange(clamp(qty + 1))} disabled={qty >= max} aria-label="Increase quantity" className="w-10 h-11 flex items-center justify-center text-brand-forest hover:text-brand-ochreDeep disabled:opacity-30">
        <span className="material-symbols-outlined text-lg">add</span>
      </button>
    </div>
  )
}

/**
 * StickyATCBar — BUSINESS JOB: mobile conversion. Once the buy buttons scroll
 * out of view, a bottom bar keeps thumb-reach purchase one tap away. It never
 * covers the footer price disclosure and disappears when the inline CTA is
 * visible again (observed via IntersectionObserver, not scroll math — immune
 * to layout shifts). Reduced-motion: instant show/hide.
 */
export function StickyATCBar({ visible, img, name, price, onAdd }: {
  visible: boolean
  img?: string
  name: string
  price: number
  onAdd: () => void
}) {
  return (
    <div
      aria-hidden={!visible}
      className={`fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-brand-border shadow-[0_-4px_16px_rgba(24,78,50,0.08)] transition-transform duration-200 motion-reduce:transition-none ${visible ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {img && <img src={img} alt="" className="w-11 h-11 rounded-lg object-cover border border-brand-border" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-brand-forest">{name}</p>
          <p className="text-sm font-serif font-bold text-brand-forest">₹{price.toLocaleString('en-IN')}</p>
        </div>
        <button className="btn btn-primary !py-2.5 !px-5 text-xs" onClick={onAdd}>Add to Cart</button>
      </div>
    </div>
  )
}

/** Observes an element and reports whether it is on screen. */
export function useOnScreen(ref: RefObject<HTMLElement | null>) {
  const [onScreen, setOnScreen] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
  return onScreen
}
