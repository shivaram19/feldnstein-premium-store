import { useCallback, useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import QuickViewModal from './QuickViewModal'
import AddToCart from './AddToCart'
import StarRating from './StarRating'
import { useContent } from '../context/ContentContext'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { inr, shopApi } from '../api/shopApi'
import { OIL_ID } from '../data/oilIds'

const CARD_WIDTH = 360

export default function CollectionSection() {
  const { t } = useLanguage()
  const { products } = useContent()
  const { openProduct } = useCart()
  const [filter, setFilter] = useState('all')
  const [currentDot, setCurrentDot] = useState(0)
  const [pages, setPages] = useState(1)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const [fadeL, setFadeL] = useState(false)
  const [fadeR, setFadeR] = useState(true)
  const [modalProduct, setModalProduct] = useState(null)
  const trackRef = useRef(null)

  // ADR-0030 move 1: live rating counts on the cards (Spiegel #7 — reviews at
  // the comparison surface). Cards render the row only when approved reviews
  // exist; a product with none shows nothing, never manufactured stars.
  const [ratings, setRatings] = useState({})
  useEffect(() => {
    let cancelled = false
    products.forEach(p => {
      const oilId = OIL_ID[p.id]
      if (!oilId) return
      shopApi
        .reviews(oilId)
        .then(s => { if (!cancelled && s.count > 0) setRatings(prev => ({ ...prev, [p.id]: s })) })
        .catch(() => { /* reviews are an enhancement — cards never fail on them */ })
    })
    return () => { cancelled = true }
  }, [products])

  const visibleCount = products.filter(
    p => filter === 'all' || p.id === filter
  ).length

  const onTrackScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    // Honest carousel state (ADR-0022 follow-on): when everything fits, there is
    // one page and both arrows are disabled instead of silently doing nothing.
    if (max <= 0) {
      setPages(1)
      setCurrentDot(0)
      setAtStart(true)
      setAtEnd(true)
      setFadeL(false)
      setFadeR(false)
      return
    }
    const count = Math.ceil(track.scrollWidth / track.clientWidth)
    const idx = Math.min(count - 1, Math.round((track.scrollLeft / max) * (count - 1)))
    setPages(count)
    setCurrentDot(idx)
    setAtStart(track.scrollLeft <= 8)
    setAtEnd(track.scrollLeft >= max - 8)
    setFadeL(track.scrollLeft > 8)
    setFadeR(track.scrollLeft < max - 8)
  }, [])

  useEffect(() => {
    onTrackScroll()
  }, [onTrackScroll, filter, products])

  useEffect(() => {
    window.addEventListener('resize', onTrackScroll)
    return () => window.removeEventListener('resize', onTrackScroll)
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
  }

  const openQuickView = (product, trigger) => {
    setModalProduct({ ...product, trigger })
  }

  return (
    <section id="collection" className="py-20 lg:py-24 bg-white border-y border-brand-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Reveal className="section-head">
          <div className="hairline-rule"></div>
          <div className="section-label">{t('section.reserve')}</div>
          <h2 className="section-title">The <em>absolute</em> reserve collection</h2>
          <p className="section-sub">{t('collection.sub')}</p>
        </Reveal>
        {/* Segregation rail (ADR-0031): product-photo anchors + label beneath +
            active underline — recognition before reading (Treisman pre-attentive
            shapes; Paivio dual coding). Replaces the single-pill non-choice. */}
        <div
          className="flex justify-start sm:justify-center gap-5 sm:gap-9 mb-10 overflow-x-auto pb-2 px-1"
          data-testid="oil-rail"
          role="tablist"
          aria-label="Filter oils"
        >
          <button
            role="tab"
            aria-selected={filter === 'all'}
            data-testid="rail-item-all"
            className="rail-item flex flex-col items-center gap-2 shrink-0"
            onClick={() => applyFilter('all')}
          >
            <span className={`rail-icon w-14 h-14 rounded-full border flex items-center justify-center transition-colors ${filter === 'all' ? 'border-brand-forest bg-brand-forest/5' : 'border-brand-border'}`}>
              <span className="material-symbols-outlined text-brand-forest">apps</span>
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-wide ${filter === 'all' ? 'text-brand-forest' : 'text-brand-subtle'}`}>All Oils</span>
            <span className={`h-0.5 w-8 rounded-full ${filter === 'all' ? 'bg-brand-forest' : 'bg-transparent'}`}></span>
          </button>
          {products.map(p => {
            const short = p.name.replace('Bull Pressed ', '').replace(' (Copra)', '').replace(' Oil', '')
            const active = filter === p.id
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={active}
                data-testid={`rail-item-${p.id}`}
                className="rail-item flex flex-col items-center gap-2 shrink-0"
                onClick={() => applyFilter(p.id)}
              >
                <span className={`rail-icon w-14 h-14 rounded-full border overflow-hidden transition-colors ${active ? 'border-brand-forest ring-2 ring-brand-forest/30' : 'border-brand-border'}`}>
                  <img src={p.img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </span>
                <span className={`text-[11px] font-bold uppercase tracking-wide ${active ? 'text-brand-forest' : 'text-brand-subtle'}`}>{short}</span>
                <span className={`h-0.5 w-8 rounded-full ${active ? 'bg-brand-forest' : 'bg-transparent'}`}></span>
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
              const show = filter === 'all' || product.id === filter
              return (
                <Reveal
                  as="article"
                  key={product.id}
                  className="product-item card-lift card-img-zoom arch-frame bg-white border border-brand-border flex flex-col min-w-[300px] sm:min-w-[340px] snap-start"
                  style={{ display: show ? 'flex' : 'none' }}
                  data-category={product.category}
                >
                  <div className="relative">
                    <button
                      className="product-card-link block w-full"
                      onClick={() => openProduct(product.id)}
                      aria-label={`View ${product.name}`}
                    >
                      <img loading="lazy" src={product.img} alt={product.name} className="w-full h-64 object-cover" />
                    </button>
                    <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-white/90 text-brand-forest rounded-full px-3 py-1">{product.badge}</span>
                  </div>
                  <div className="p-6 flex flex-col flex-1 text-center">
                    <button
                      className="product-card-link font-serif text-lg font-semibold text-brand-forest hover:text-brand-ochreDeep transition-colors"
                      onClick={() => openProduct(product.id)}
                    >
                      {product.name}
                    </button>
                    <p className="mt-1 text-xs text-brand-charcoal/70 leading-relaxed flex-1">{product.desc}</p>
                    {ratings[product.id] && (
                      <a
                        href={`#product-${product.id}`}
                        onClick={e => { e.preventDefault(); openProduct(product.id) }}
                        className="mt-2 inline-flex items-center gap-1.5 justify-center"
                        data-testid="card-rating"
                        aria-label={`${Number(ratings[product.id].average).toFixed(1)} stars, ${ratings[product.id].count} reviews — view ${product.name}`}
                      >
                        <StarRating rating={ratings[product.id].average} />
                        <span className="text-xs font-semibold text-brand-charcoal/70">
                          {Number(ratings[product.id].average).toFixed(1)} · {ratings[product.id].count} review{ratings[product.id].count === 1 ? '' : 's'}
                        </span>
                      </a>
                    )}
                    <div className="mt-4 flex items-baseline justify-center gap-2">
                      <span className="font-serif text-xl font-bold text-brand-forest">{inr(product.price)}</span>
                      {product.priceRange && <span className="text-xs text-brand-charcoal/50">Range: {product.priceRange}</span>}
                    </div>
                    <div className="mt-4">
                      <AddToCart product={product} />
                    </div>
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
          <button
            onClick={() => scrollCarousel(-1)}
            aria-label="Previous products"
            disabled={atStart}
            className="w-10 h-10 rounded-full border border-brand-border text-brand-forest flex items-center justify-center hover:bg-brand-warmCard transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div id="carouselDots" className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: pages }).map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all ${
                  i === currentDot ? 'w-6 h-1.5 bg-brand-forest' : 'w-1.5 h-1.5 bg-brand-border'
                }`}
              ></span>
            ))}
          </div>
          <button
            onClick={() => scrollCarousel(1)}
            aria-label="Next products"
            disabled={atEnd}
            className="w-10 h-10 rounded-full border border-brand-border text-brand-forest flex items-center justify-center hover:bg-brand-warmCard transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
      <QuickViewModal product={modalProduct} onClose={() => setModalProduct(null)} />
    </section>
  )
}
