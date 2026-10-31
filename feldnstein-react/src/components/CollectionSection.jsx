import { useCallback, useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import QuickViewModal from './QuickViewModal'
import { useCart } from '../context/CartContext'
import { useContent } from '../context/ContentContext'

const DOT_COUNT = 4
const CARD_WIDTH = 360

export default function CollectionSection() {
  const { addToCart } = useCart()
  const { products, categories } = useContent()
  const [filter, setFilter] = useState('all')
  const [currentDot, setCurrentDot] = useState(0)
  const [fadeL, setFadeL] = useState(false)
  const [fadeR, setFadeR] = useState(true)
  const [modalProduct, setModalProduct] = useState(null)
  const trackRef = useRef(null)

  const visibleCount = products.filter(
    p => filter === 'all' || p.category.includes(filter)
  ).length

  const syncDots = useCallback(idx => {
    setCurrentDot(prev => (prev === idx ? prev : idx))
  }, [])

  const onTrackScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    if (max <= 0) return
    const idx = Math.min(
      DOT_COUNT - 1,
      Math.floor((track.scrollLeft / max) * DOT_COUNT)
    )
    syncDots(idx)
    setFadeL(track.scrollLeft > 8)
    setFadeR(track.scrollLeft < max - 8)
  }, [syncDots])

  useEffect(() => {
    onTrackScroll()
  }, [onTrackScroll])

  const scrollCarousel = dir => {
    trackRef.current?.scrollBy({ left: dir * CARD_WIDTH, behavior: 'smooth' })
  }

  const applyFilter = category => {
    setFilter(category)
    const track = trackRef.current
    if (track) {
      track.scrollTo({ left: 0 })
      onTrackScroll()
    }
    syncDots(0)
  }

  const openQuickView = (product, trigger) => {
    setModalProduct({ ...product, trigger })
  }

  return (
    <section id="collection" className="py-20 lg:py-24 bg-white border-y border-brand-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Reveal className="section-head">
          <div className="hairline-rule"></div>
          <div className="section-label">03 — The Absolute Reserve</div>
          <h2 className="section-title">The <em>absolute</em> reserve collection</h2>
          <p className="section-sub">Five pure cold-pressed oils, hand-harvested and stone-milled within 24 hours of extraction.</p>
        </Reveal>
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map(cat => {
            const active = filter === cat.key
            return (
              <button
                key={cat.key}
                className={`category-pill px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  active ? 'bg-brand-forest text-white' : 'text-brand-subtle'
                }`}
                onClick={() => applyFilter(cat.key)}
                aria-pressed={active}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
        <div className="relative">
          <div className={`carousel-fade carousel-fade-l ${fadeL ? 'show' : ''}`} aria-hidden="true"></div>
          <div className={`carousel-fade carousel-fade-r ${fadeR ? 'show' : ''}`} aria-hidden="true"></div>
          <div
            ref={trackRef}
            onScroll={onTrackScroll}
            id="productCarousel"
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4"
            style={{ scrollbarWidth: 'none', scrollPadding: '0 16px' }}
            role="region"
            aria-label="Products"
          >
            {products.map(product => {
              const show = filter === 'all' || product.category.includes(filter)
              return (
                <Reveal
                  as="article"
                  key={product.id}
                  className="product-item card-lift card-img-zoom arch-frame bg-white border border-brand-border flex flex-col min-w-[300px] sm:min-w-[340px] snap-start"
                  style={{ display: show ? 'flex' : 'none' }}
                  data-category={product.category}
                >
                  <div className="relative">
                    <img loading="lazy" src={product.img} alt={product.name} className="w-full h-64 object-cover" />
                    <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-white/90 text-brand-forest rounded-full px-3 py-1">{product.badge}</span>
                  </div>
                  <div className="p-6 flex flex-col flex-1 text-center">
                    <h3 className="font-serif text-lg font-semibold text-brand-forest">{product.name}</h3>
                    <p className="mt-1 text-xs text-brand-charcoal/70 leading-relaxed flex-1">{product.desc}</p>
                    <div className="mt-4 flex items-baseline justify-center gap-2">
                      <span className="font-serif text-xl font-bold text-brand-forest">₹{product.price}</span>
                      {product.priceRange && <span className="text-xs text-brand-charcoal/50">Range: {product.priceRange}</span>}
                    </div>
                    <button
                      className="btn btn-primary mt-4 w-full quick-add"
                      onClick={() => addToCart(product.name, product.price)}
                    >
                      Add to Reserve Cart
                    </button>
                    <button
                      className="btn btn-ghost mt-2 w-full quick-view-btn"
                      onClick={e => openQuickView(product, e.currentTarget)}
                    >
                      Quick View
                    </button>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
        <p id="filterEmpty" className={`${visibleCount > 0 ? 'hidden' : ''} text-center text-sm text-brand-charcoal/60 py-8`}>
          No products in this category yet.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button onClick={() => scrollCarousel(-1)} aria-label="Previous products" className="w-10 h-10 rounded-full border border-brand-border text-brand-forest flex items-center justify-center hover:bg-brand-warmCard transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div id="carouselDots" className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: DOT_COUNT }).map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all ${
                  i === currentDot ? 'w-6 h-1.5 bg-brand-forest' : 'w-1.5 h-1.5 bg-brand-border'
                }`}
              ></span>
            ))}
          </div>
          <button onClick={() => scrollCarousel(1)} aria-label="Next products" className="w-10 h-10 rounded-full border border-brand-border text-brand-forest flex items-center justify-center hover:bg-brand-warmCard transition-colors">
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
      <QuickViewModal product={modalProduct} onClose={() => setModalProduct(null)} />
    </section>
  )
}
