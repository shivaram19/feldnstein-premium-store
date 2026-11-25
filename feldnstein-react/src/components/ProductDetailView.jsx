import { useEffect, useMemo, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import { useContent } from '../context/ContentContext'
import StarRating from './StarRating'
import Gallery from './pdp/Gallery'
import UspChips from './pdp/UspChips'
import PriceBlock from './pdp/PriceBlock'
import VariantSelector from './pdp/VariantSelector'
import QuantityStepper, { StickyATCBar, useOnScreen } from './pdp/QuantityStepper'
import FaqSection from './pdp/FaqSection'
import ReviewsSection from './pdp/ReviewsSection'
import ComparisonTable from './pdp/ComparisonTable'
import SubscribeSaveRow from './pdp/SubscribeSaveRow'
import { productContent, oilComparison } from '../data/productContent'
import { shopApi } from '../api/shopApi'
import { useLanguage } from '../context/LanguageContext'

const FREE_SHIPPING_THRESHOLD = 499

// Storefront product id → backend oil_product id (ADR-0028). Sunflower has
// no backend catalog entry yet, so it renders no reviews — by design.
const OIL_ID = { groundnut: 1, sesame: 2, coconut: 3 }

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

/**
 * ProductDetailView — assembled from minute-segment components (ADR-0025),
 * each a conscious business decision documented in its own file: Gallery
 * (touch-the-bottle), UspChips (3-second trust), PriceBlock (offer clarity),
 * VariantSelector (Radix radio semantics), QuantityStepper + StickyATCBar
 * (mobile conversion), FaqSection (objection handling + SEO),
 * ComparisonTable (whole-catalog cross-sell). Radix primitives carry
 * behavior; everything else is hand-built with the same rigor.
 */
export default function ProductDetailView({ productId }) {
  const { products } = useContent()
  const { addToCart, setView, showToast, subscribe, setSubscribe } = useCart()
  const { t } = useLanguage()
  const product = products.find(p => p.id === productId)
  const content = productContent[productId]

  const sizes = useMemo(
    () => (product?.sizes ?? []).filter(s => s.priceInclGst != null || s.price != null),
    [product],
  )
  const [chosen, setChosen] = useState(null)
  const [qty, setQty] = useState(1)
  const ctaRowRef = useRef(null)
  const [batch, setBatch] = useState(null)
  useEffect(() => {
    const oilId = OIL_ID[productId]
    if (!oilId) return
    let cancelled = false
    shopApi.currentBatch(oilId)
      .then(b => { if (!cancelled) setBatch(b) })
      .catch(() => { /* no released batch → the row simply stays hidden */ })
    return () => { cancelled = true }
  }, [productId])
  const ctaOnScreen = useOnScreen(ctaRowRef)

  const priceOf = s => s.priceInclGst ?? s.price ?? 0
  const current = sizes.find(s => s.variantId === chosen) ?? sizes[0]
  const price = current ? priceOf(current) : product?.price ?? 0
  const mrp = current?.mrp ?? null
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
          <Gallery images={gallery} alt={product.name} />

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

            <UspChips items={content?.usps} />

            {/* Price block — three honest tiers: MRP → our price → offer (when configured) */}
            <PriceBlock price={price} mrp={mrp} offer={product.offer ?? null} qty={qty} />

            <SubscribeSaveRow checked={subscribe} onChange={setSubscribe} price={price} />

            <VariantSelector
              options={sizes.map(s => ({ variantId: s.variantId, label: s.label, sizeMl: s.sizeMl, price: priceOf(s), mrp: s.mrp ?? null }))}
              value={current?.variantId}
              onChange={setChosen}
            />

            <div ref={ctaRowRef} className="mt-6 flex flex-wrap items-stretch gap-3">
              <QuantityStepper qty={qty} onChange={setQty} />
              <button id="detailAddBtn" className="btn btn-primary flex-1 min-w-[10rem] justify-center" disabled={!current} onClick={handleAddToCart}>
                {t('pdp.addToCart')}
              </button>
              <button id="detailBuyNowBtn" className="btn btn-gold flex-1 min-w-[10rem] justify-center" disabled={!current} onClick={handleBuyNow}>
                {t('pdp.buyNow')}
              </button>
            </div>

            {/* Description */}
            <h2 className="mt-10 text-xs font-bold uppercase tracking-[0.12em] text-brand-forest border-b border-brand-border pb-2">Product Description</h2>
            <div id="productStory" className="mt-4 space-y-4 text-sm leading-relaxed text-brand-charcoal/85">
              {product.story?.length ? product.story.map((para, i) => <p key={i}>{para}</p>) : <p>{product.desc}</p>}
            </div>

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

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {product.perfectFor?.length > 0 && (
                <div className="rounded-2xl border border-brand-border bg-white p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal/60">Perfect For</span>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {product.perfectFor.map(f => (
                      <div key={f.label} className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-brand-forest text-xl w-6 flex justify-center shrink-0">{f.icon}</span>
                        <span className="text-[13px] font-semibold text-brand-charcoal/85">{f.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 border-t border-brand-border pt-3 text-[11px] leading-relaxed text-brand-charcoal/60">
                    From the bottle label — the same facts you hold in your hand, nothing more.
                  </p>
                </div>
              )}
              <div className="rounded-2xl border border-brand-border bg-white p-5 space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal/60">Good to Know</span>
                {product.ingredients && <FactRow icon="inventory_2" label="Ingredients" value={product.ingredients} />}
                {product.storage && <FactRow icon="warehouse" label="Storage" value={product.storage} />}
                {product.shelfLife && <FactRow icon="event_available" label="Best Before" value={product.shelfLife} />}
                {batch && (
                  <div className="border-t border-brand-border pt-3">
                    <FactRow
                      icon="history"
                      label="Current Batch"
                      value={`${batch.batchCode} · pressed ${new Date(batch.pressDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${batch.yieldLitres} L pressed`}
                    />
                  </div>
                )}
                <div className="border-t border-brand-border pt-3">
                  <FactRow icon="factory" label="Packed & Marketed By" value="FELD N STEIN, Mothadaka, Guntur District, Andhra Pradesh · Customer care +91 91600 98989" />
                </div>
              </div>
            </div>

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

            <ReviewsSection oilProductId={OIL_ID[productId] ?? null} />

            <FaqSection faqs={content?.faqs} />
          </div>
        </div>

        <ComparisonTable currentId={productId} oils={oilComparison} />
      </div>

      <StickyATCBar visible={!ctaOnScreen} img={gallery[0]} name={product.name} price={price} onAdd={handleAddToCart} />
    </div>
  )
}
