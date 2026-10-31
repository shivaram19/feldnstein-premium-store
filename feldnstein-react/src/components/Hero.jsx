import { useEffect, useState } from 'react'
import Reveal from './Reveal'
import AmbientVideo from './AmbientVideo'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { useContent } from '../context/ContentContext'

// Kinetic typography: split the hero headline into staggered words.
const HEADLINE = [
  { text: 'Where tradition meets ', em: false },
  { text: 'purity.', em: true },
]

function buildSegments() {
  const segments = []
  let wordIndex = 0
  for (const { text, em } of HEADLINE) {
    text.split(/(\s+)/).forEach(part => {
      if (!part) return
      if (/^\s+$/.test(part)) {
        segments.push({ space: true, text: part })
      } else {
        segments.push({ space: false, text: part, em, d: 0.15 + wordIndex * 0.09 })
        wordIndex += 1
      }
    })
  }
  return segments
}

function KineticHeadline({ liveHeadline }) {
  const reduced = usePrefersReducedMotion()
  const [kineticIn, setKineticIn] = useState(false)

  useEffect(() => {
    if (reduced || liveHeadline) return undefined
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setKineticIn(true))
    )
    return () => cancelAnimationFrame(raf)
  }, [reduced, liveHeadline])

  const baseClass =
    'font-serif font-medium text-white tracking-tight text-[3rem] leading-[1.02] sm:text-7xl lg:text-[6.5rem] lg:leading-[0.98] mt-4'

  if (liveHeadline) {
    const words = liveHeadline.trim().split(/\s+/)
    const last = words.pop()
    return (
      <h1 id="heroTitle" className={baseClass}>
        {words.join(' ')}{words.length ? ' ' : ''}<em className="italic font-normal text-brand-ochre">{last}</em>
      </h1>
    )
  }

  if (reduced) {
    return (
      <h1 id="heroTitle" className={baseClass}>
        Where tradition meets <em className="italic font-normal text-brand-ochre">purity.</em>
      </h1>
    )
  }

  return (
    <h1 id="heroTitle" className={`${baseClass} ${kineticIn ? 'kinetic-in' : ''}`}>
      {buildSegments().map((s, i) =>
        s.space ? (
          s.text
        ) : s.em ? (
          <em key={i} className="italic font-normal text-brand-ochre">
            <span className="k-word" style={{ '--d': `${s.d}s` }}>{s.text}</span>
          </em>
        ) : (
          <span key={i} className="k-word" style={{ '--d': `${s.d}s` }}>{s.text}</span>
        )
      )}
    </h1>
  )
}

export default function Hero() {
  const { hero } = useContent()
  return (
    <section id="hero" className="relative w-full min-h-[100svh] flex items-center overflow-hidden bg-brand-forestDark">
      {hero?.imageUrl ? (
        <img
          className="absolute inset-0 w-full h-full object-cover"
          src={hero.imageUrl}
          alt={hero.headline || 'FELD·N·STEIN farm'}
        />
      ) : (
        <AmbientVideo
          className="ambient-video absolute inset-0 w-full h-full object-cover"
          src="/assets/video/hero-cinematic.mp4"
          poster="/assets/video/hero-cinematic-poster.jpg"
          ariaLabel="Bulls circling the traditional gaanuga oil press at the Mothadaka farm"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-forestDark/95 via-brand-forestDark/70 to-brand-forestDark/25 pointer-events-none"></div>
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand-forestDark/70 to-transparent pointer-events-none"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-28 lg:py-36 w-full">
        <div className="max-w-3xl">
          <Reveal className="section-label">
            <span className="material-symbols-outlined text-sm">eco</span> Farm-Direct · Lab-Tested · Small Batch
          </Reveal>
          <KineticHeadline liveHeadline={hero?.headline || null} />
          <Reveal className="mt-8 text-base sm:text-lg text-white/80 leading-relaxed max-w-md">
            {hero?.subcopy || 'Bull-pressed oils, crafted slowly from the finest seeds. No heat. No chemicals. Just pure oil your family can trust.'}
          </Reveal>
          <Reveal className="mt-10 flex flex-wrap items-center gap-4">
            <a href="#collection" className="btn btn-gold">Shop the Reserve <span className="material-symbols-outlined text-base">arrow_forward</span></a>
            <a href="#matrix" className="btn btn-ghost-light">Our Standard</a>
          </Reveal>
          <Reveal className="mt-12 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full pl-2 pr-4 py-1.5 border border-white/15">
              <span className="material-symbols-outlined text-brand-ochre text-xl">verified</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">Lab Verified · Batch 042</span>
            </span>
            <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full pl-2 pr-4 py-1.5 border border-white/15">
              <span className="material-symbols-outlined text-brand-ochre text-xl">shield</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">FSSAI Certified Mill</span>
            </span>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
