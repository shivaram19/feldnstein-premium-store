import { useCallback, useState } from 'react'
import Reveal from '../Reveal'
import MillSplatViewer from './MillSplatViewer'

const PLY_URL = '/assets/splats/mill-tour.ply'
const POSTER_URL = '/assets/splats/mill-tour-poster.jpg'

/**
 * "Tour the Mill in 3D" home section (ADR-0026). The shed, its environment
 * and motion, rebuilt from the Gaussian splat captured at Mothadaka.
 * Click-to-load: the poster weighs 141KB; the engine + splat (~4.9MB) load
 * only on explicit intent — page weight and mobile patience stay untouched.
 */
export default function Tour3DSection() {
  const [phase, setPhase] = useState('poster') // poster | loading | ready | error

  const handleLoad = useCallback(() => setPhase('loading'), [])
  const handleReady = useCallback(() => setPhase('ready'), [])
  const handleError = useCallback(() => setPhase('error'), [])

  return (
    <section id="tour" className="py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Reveal className="section-head">
          <div className="hairline-rule"></div>
          <div className="section-label"><span className="material-symbols-outlined text-sm">360</span> The Mothadaka Mill</div>
          <h2 className="section-title">Step Inside the <em>Shed</em> in 3D</h2>
          <p className="section-sub">
            Every bottle is pressed under this roof. This is the actual mill — reconstructed
            from 137 video frames into 19,091 gaussian splats. Drag to walk around the Gaanuga.
          </p>
        </Reveal>

        <Reveal className="relative aspect-video max-w-5xl mx-auto rounded-2xl overflow-hidden border border-brand-border bg-brand-forestDark shadow-xl">
          <img
            src={POSTER_URL}
            alt="The Mothadaka mill shed — corrugated roof, green shade netting, the granite Gaanuga churn with the pressing bull"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${phase === 'ready' ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
          />

          {(phase === 'poster' || phase === 'error') && (
            <button
              data-testid="tour-load-btn"
              onClick={handleLoad}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-brand-forestDark/40 hover:bg-brand-forestDark/30 transition-colors group"
              aria-label="Load the interactive 3D mill tour"
            >
              <span className="w-20 h-20 rounded-full bg-brand-ochre text-brand-forestDark flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-4xl" aria-hidden="true">play_arrow</span>
              </span>
              <span className="text-white text-xs font-bold uppercase tracking-[0.2em] drop-shadow">
                {phase === 'error' ? '3D unavailable on this device — tap to retry' : 'Tour the mill in 3D'}
              </span>
              <span className="text-white/70 text-[11px] drop-shadow">drags to orbit · scroll to zoom</span>
            </button>
          )}

          {phase === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-forestDark/60">
              <div className="flex flex-col items-center gap-3">
                <span className="w-10 h-10 rounded-full border-2 border-white/20 border-t-brand-ochre animate-spin" aria-hidden="true"></span>
                <span className="text-white/80 text-xs uppercase tracking-widest">Rebuilding the shed…</span>
              </div>
            </div>
          )}

          {(phase === 'loading' || phase === 'ready') && (
            <MillSplatViewer src={PLY_URL} onReady={handleReady} onError={handleError} />
          )}
        </Reveal>

        <Reveal className="max-w-5xl mx-auto mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-brand-subtle">
          <span>Captured on location at Mothadaka · reconstructed with the free Brush pipeline</span>
          <span>best on desktop · works on any WebGPU or WebGL2 browser</span>
        </Reveal>
      </div>
    </section>
  )
}
