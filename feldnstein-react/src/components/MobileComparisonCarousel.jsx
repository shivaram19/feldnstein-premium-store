import { useCallback, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export default function MobileComparisonCarousel({ rows }) {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)
  const reduced = usePrefersReducedMotion()
  const count = rows.length

  const onScroll = useCallback(() => {
    const track = trackRef.current
    if (!track || track.clientWidth <= 0) return
    const next = Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth)))
    setIndex(next)
  }, [count])

  const goTo = (i) => {
    const track = trackRef.current
    if (!track) return
    const next = Math.min(count - 1, Math.max(0, i))
    track.scrollTo({ left: next * track.clientWidth, behavior: reduced ? 'auto' : 'smooth' })
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goTo(index - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goTo(index + 1)
    }
  }

  const arrowClass = 'w-10 h-10 rounded-full border border-brand-border text-brand-forest flex items-center justify-center hover:bg-brand-warmCard transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent'

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand-subtle" aria-live="polite">
          Comparison {index + 1} of {count}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous comparison" className={arrowClass}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <button onClick={() => goTo(index + 1)} disabled={index === count - 1} aria-label="Next comparison" className={arrowClass}>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Comparison details — swipe or use arrow keys"
        className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [touch-action:pan-y]"
      >
        {rows.map(row => (
          <article key={row.title} className="w-full flex-none snap-center" aria-label={row.title}>
            <div className="h-full rounded-2xl bg-white border border-brand-border overflow-hidden flex flex-col">
              <div className="p-5 bg-brand-warmCard/70 border-b border-brand-border flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-full bg-brand-ochre/20 text-brand-forest flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-lg">{row.icon}</span>
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-brand-forest leading-snug">{row.title}</h3>
                  <p className="text-xs text-brand-subtle mt-0.5">{row.sub}</p>
                </div>
              </div>
              <div className="p-5 bg-brand-rust/15 border-b border-brand-border/60">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-rust"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-rust">Commercial Baseline</span>
                  </div>
                  <span className="text-[11px] text-brand-subtle font-medium">Refined Seed Oils</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-base text-brand-rust flex-shrink-0">close</span>
                  <span className="text-sm font-bold text-brand-charcoal/80">{row.commercial}</span>
                </div>
                <p className="text-xs text-brand-subtle leading-relaxed">{row.commercialDesc}</p>
              </div>
              <div className="p-5 bg-brand-forest flex-1">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-ochre"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-white">FELD·N·STEIN</span>
                  </div>
                  <span className="text-[11px] text-white/90 font-medium">Vedic Gaanuga Mill</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-base text-brand-ochre flex-shrink-0">check_circle</span>
                  <span className="text-sm font-bold text-white">{row.artisanal}</span>
                </div>
                <p className="text-xs text-white/75 leading-relaxed">{row.artisanalDesc}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {rows.map((row, i) => (
          <button
            key={row.title}
            onClick={() => goTo(i)}
            aria-label={`Go to comparison ${i + 1}: ${row.title}`}
            aria-current={i === index}
            className={`rounded-full transition-all ${i === index ? 'w-6 h-1.5 bg-brand-forest' : 'w-1.5 h-1.5 bg-brand-border'}`}
          ></button>
        ))}
      </div>
    </div>
  )
}
