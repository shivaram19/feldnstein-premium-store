import { useMemo, useState } from 'react'
import { useCart } from '../context/CartContext'
import { useContent } from '../context/ContentContext'
import { inr } from '../api/shopApi'
import StarRating from './StarRating'

// Matches the backend loyalty default (loyalty.earn-percent=5, ADR-0018):
// points shown are 5% of the amount spent.
const LOYALTY_EARN_PERCENT = 5
const FREE_SHIPPING_THRESHOLD = 499

const TRUST_BADGES = [
  { icon: 'local_shipping', title: 'Free Shipping', sub: `On orders above ₹${FREE_SHIPPING_THRESHOLD}` },
  { icon: 'support_agent', title: '360° Customer Support', sub: 'Real people, on call' },
  { icon: 'undo', title: 'Up to 5 Days Return', sub: 'No-questions-asked' },
  { icon: 'fact_check', title: '40+ Quality Checks', sub: 'On every single batch' },
]

function FactRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-brand-ochre text-xl mt-0.5">{icon}</span>
      <div>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-charcoal/55">{label}</span>
        <span className="text-[13px] text-brand-charcoal/85 leading-snug">{value}</span>
      </div>
    </div>
  )
}

export default function ProductDetailView({ productId }) {
  const { products } = useContent()
  const { addToCart, setView, showToast } = useCart()
  const product = products.find(p => p.id === productId)

  const sizes = useMemo(
    () => (product?.sizes ?? []).filter(s => s.priceInclGst != null || s.price != null),
    [product],
  )
  const [chosen, setChosen] = useState(null)
  const [qty, setQty] = useState(1)
  const [imgIdx, setImgIdx] = useState(0)

  const priceOf = s => s.priceInclGst ?? s.price ?? 0
  const current = sizes.find(s => s.variantId === chosen) ?? sizes[0]
  const price = current ? priceOf(current) : product?.price ?? 0
  const mrp = current?.mrp ?? null
  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null
  const gallery = product?.gallery ?? [product?.img].filter(Boolean)

  const goToCollection = () => {
    setView('home')
    window.setTimeout(() => document.getElementById('collection')?.scrollIntoView(), 60)
  }

  const share = () => {
    const link = window.location.href
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(
        () => showToast('Product link copied'),
        () => showToast(link),
      )
    } else {
      showToast(link)
    }
  }

  if (!product) {
    return (
      <div id="productDetail" className="max-w-3xl mx-auto px-6 py-24 text-center">
        <button id="backToCollection" onClick={goToCollection} className="btn btn-ghost btn-sm">
          ← Back to the collection
        </button>
        <h1 className="mt-8 font-serif text-3xl font-semibold text-brand-forest">This oil isn't in the reserve</h1>
        <p className="mt-3 text-sm text-brand-charcoal/70">The product you're looking for doesn't exist or has sold out.</p>
      </div>
    )
  }

  const points = Math.floor(((price * qty) / 100) * LOYALTY_EARN_PERCENT)

  const handleAddToCart = () => {
    if (!current) return
    addToCart(current.variantId, product.name, price, current.sizeMl, qty)
  }

  const handleBuyNow = () => {
    if (!current) return
    addToCart(current.variantId, product.name, price, current.sizeMl, qty).then(() => setView('checkout'))
  }

  return (
    <div id="productDetail" className="bg-brand-ivory">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8 lg:py-12">
        <button
          id="backToCollection"
          onClick={goToCollection}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-forest hover:text-brand-ochreDeep transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to the collection
        </button>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-start">
          {/* Image gallery */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-brand-border bg-white overflow-hidden">
              <img id="detailMainImg" src={gallery[imgIdx]} alt={product.name} className="w-full aspect-square object-cover" />
            </div>
            {gallery.length > 1 && (
              <div className="mt-4 flex gap-3 flex-wrap">
                {gallery.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    aria-label={`View image ${i + 1}`}
                    aria-pressed={i === imgIdx}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition ${i === imgIdx ? 'border-brand-forest' : 'border-brand-border opacity-70 hover:opacity-100'}`}
                  >
                    <img src={g} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info column */}
          <div>
            {product.tagline && (
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-subtle/80">{product.tagline}</p>
            )}
            <div className="mt-1.5 flex items-start justify-between gap-4">
              <h1 className="font-serif text-3xl lg:text-4xl font-semibold text-brand-forest leading-tight">{product.name}</h1>
              <button
                onClick={share}
                aria-label="Copy product link"
                className="shrink-0 w-10 h-10 rounded-full border border-brand-border flex items-center justify-center text-brand-forest hover:bg-brand-warmCard transition-colors"
              >
                <span className="material-symbols-outlined">share</span>
              </button>
            </div>

            {product.rating != null && (
              <div className="mt-2 flex items-center gap-2">
                <StarRating rating={product.rating} />
                <span className="text-sm text-brand-charcoal/70">
                  {Number(product.rating).toFixed(1)} ({product.reviewCount ?? 0} reviews)
                </span>
              </div>
            )}

            {/* Price block */}
            <div className="mt-5 rounded-2xl border border-brand-border bg-brand-warmCard p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-charcoal/60">Your Price</span>
                  <div className="mt-0.5 flex items-baseline gap-2.5">
                    <span id="detailPrice" className="font-serif text-3xl font-bold text-brand-forest">{inr(price)}</span>
                    {mrp && mrp > price && <span className="text-sm text-brand-charcoal/50 line-through">{inr(mrp)}</span>}
                  </div>
                </div>
                {discount && (
                  <span className="rounded-lg bg-brand-ochre/15 text-brand-ochreDeep px-3 py-1.5 text-xs font-bold whitespace-nowrap">
                    {discount}% OFF
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-brand-charcoal/55">
                incl. of all taxes
                {mrp && mrp > price && <> · You save {inr(mrp - price)}</>}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-brand-herb">
                <span className="material-symbols-outlined text-base">eco</span>
                Buy now & earn {points} loyalty points instantly
              </p>
            </div>

            {/* Variant selector */}
            {sizes.length > 0 && (
              <div className="mt-6">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal/70">Select Variant</span>
                <div id="variantGrid" role="listbox" aria-label="Select variant" className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {sizes.map(s => {
                    const active = current?.variantId === s.variantId
                    const p = priceOf(s)
                    return (
                      <button
                        key={s.variantId}
                        role="option"
                        aria-selected={active}
                        onClick={() => setChosen(s.variantId)}
                        className={`text-left rounded-xl border-2 p-3 transition ${active ? 'border-brand-forest bg-brand-forest/5' : 'border-brand-border bg-white hover:border-brand-forest/40'}`}
                      >
                        <span className="block text-xs font-semibold text-brand-charcoal">{s.label ?? `${s.sizeMl} ml`}</span>
                        <span className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-serif text-lg font-bold text-brand-forest">{inr(p)}</span>
                          <span className="text-[10px] text-brand-charcoal/55">₹{Math.round(p / (s.sizeMl / 1000))}/L</span>
                        </span>
                        {s.mrp && s.mrp > p && <span className="block text-[11px] text-brand-charcoal/50 line-through">MRP {inr(s.mrp)}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quantity + CTAs */}
            <div className="mt-6 flex flex-wrap items-stretch gap-3">
              <div className="flex items-center rounded-full border border-brand-border bg-white">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity" className="w-10 h-11 flex items-center justify-center text-brand-forest hover:text-brand-ochreDeep">
                  <span className="material-symbols-outlined text-lg">remove</span>
                </button>
                <span id="detailQty" className="w-8 text-center font-semibold text-brand-forest">{qty}</span>
                <button onClick={() => setQty(q => Math.min(10, q + 1))} aria-label="Increase quantity" className="w-10 h-11 flex items-center justify-center text-brand-forest hover:text-brand-ochreDeep">
                  <span className="material-symbols-outlined text-lg">add</span>
                </button>
              </div>
              <button id="detailAddBtn" className="btn btn-primary flex-1 min-w-[10rem] justify-center" disabled={!current} onClick={handleAddToCart}>
                Add to Cart
              </button>
              <button id="detailBuyNowBtn" className="btn btn-gold flex-1 min-w-[10rem] justify-center" disabled={!current} onClick={handleBuyNow}>
                Buy Now
              </button>
            </div>

            {/* Description */}
            <h2 className="mt-10 text-xs font-bold uppercase tracking-[0.12em] text-brand-forest border-b border-brand-border pb-2">Product Description</h2>
            <div id="productStory" className="mt-4 space-y-4 text-sm leading-relaxed text-brand-charcoal/85">
              {product.story?.length ? product.story.map((para, i) => <p key={i}>{para}</p>) : <p>{product.desc}</p>}
            </div>

            {/* Highlights */}
            {product.highlights?.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {product.highlights.map(h => (
                  <span key={h} className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-warmCard px-3 py-1.5 text-[11px] font-semibold text-brand-forest">
                    <span className="material-symbols-outlined text-sm text-brand-ochre">check_circle</span>
                    {h}
                  </span>
                ))}
              </div>
            )}

            {/* Perfect for + facts */}
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {product.perfectFor?.length > 0 && (
                <div className="rounded-2xl border border-brand-border bg-white p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal/60">Perfect For</span>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {product.perfectFor.map(f => (
                      <div key={f.label} className="flex flex-col items-center gap-1.5">
                        <span className="material-symbols-outlined text-brand-forest">{f.icon}</span>
                        <span className="text-[10px] font-semibold text-brand-charcoal/75 leading-tight">{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(product.ingredients || product.storage || product.shelfLife) && (
                <div className="rounded-2xl border border-brand-border bg-white p-5 space-y-3">
                  {product.ingredients && <FactRow icon="inventory_2" label="Ingredients" value={product.ingredients} />}
                  {product.storage && <FactRow icon="warehouse" label="Storage" value={product.storage} />}
                  {product.shelfLife && <FactRow icon="event_available" label="Shelf Life" value={product.shelfLife} />}
                </div>
              )}
            </div>

            {/* Nutrition facts */}
            {product.nutrition && (
              <div className="mt-6 rounded-2xl border-2 border-brand-charcoal bg-white p-5 max-w-md">
                <h3 className="font-serif text-lg font-bold text-brand-forest">
                  Nutrition Facts <span className="font-sans text-xs font-normal text-brand-charcoal/60">(Approx.)</span>
                </h3>
                <p className="mt-1 border-b border-brand-border pb-2 text-xs text-brand-charcoal/60">Serving Size: {product.nutrition.serving}</p>
                <table id="nutritionTable" className="mt-1 w-full text-xs">
                  <tbody>
                    {product.nutrition.rows.map(([name, amount, dv]) => (
                      <tr key={name} className="border-b border-brand-border/60 last:border-0">
                        <td className="py-1.5 text-brand-charcoal">{name}</td>
                        <td className="py-1.5 text-right font-semibold text-brand-charcoal">{amount}</td>
                        <td className="py-1.5 w-12 text-right text-brand-charcoal/60">{dv}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[10px] text-brand-charcoal/50">* Percent Daily Values are based on a 2,000 calorie diet.</p>
              </div>
            )}

            {/* Trust badges */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-brand-border pt-8">
              {TRUST_BADGES.map(t => (
                <div key={t.title} className="trust-badge flex flex-col items-center text-center gap-1.5">
                  <span className="material-symbols-outlined text-3xl text-brand-forest">{t.icon}</span>
                  <span className="text-xs font-bold text-brand-forest">{t.title}</span>
                  <span className="text-[11px] text-brand-charcoal/60">{t.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
