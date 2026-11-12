import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

// Ambient video: respects reduced motion (poster/static frame stays).
// `lazy` videos load their source only when near the viewport.
export default function AmbientVideo({
  src,
  poster,
  className,
  ariaLabel,
  lazy = false,
  ...rest
}) {
  const videoRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (reduced) {
      v.removeAttribute('autoplay')
      v.pause()
      return
    }
    // Playback upgrades on first real user interaction (tap/click/key), never at
    // load or scroll: autoplaying ambient video decodes on the main thread and can
    // freeze low-memory devices (and India's typical 2–4GB Android). Lazy videos
    // only fetch their source once both conditions hold — near the viewport AND
    // after interaction; the poster is the designed visual until then.
    let interacted = false
    const start = () => {
      if (lazy) {
        const srcEl = v.querySelector('source[data-src]')
        if (srcEl && !srcEl.src) {
          srcEl.src = srcEl.dataset.src
          v.load()
        }
      }
      v.play().catch(() => {})
    }
    const onInteract = () => {
      interacted = true
      if (!lazy || v.dataset.near === '1') start()
    }
    window.addEventListener('pointerdown', onInteract, { capture: true })
    window.addEventListener('keydown', onInteract, { capture: true })
    let observer
    if (lazy) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (!e.isIntersecting) return
            v.dataset.near = '1'
            if (interacted) start()
            observer.unobserve(v)
          })
        },
        { rootMargin: '300px' }
      )
      observer.observe(v)
    }
    return () => {
      window.removeEventListener('pointerdown', onInteract, true)
      window.removeEventListener('keydown', onInteract, true)
      observer?.disconnect()
    }
  }, [reduced, lazy])

  return (
    <video
      ref={videoRef}
      className={className}
      data-lazy={lazy || undefined}
      muted
      loop
      playsInline
      preload={lazy ? 'none' : 'metadata'}
      poster={poster}
      autoPlay={false}
      aria-label={ariaLabel}
      {...rest}
    >
      <source data-src={lazy ? src : undefined} src={lazy ? undefined : src} type="video/mp4" />
      {poster && (
        <img
          src={poster}
          alt={ariaLabel || ''}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </video>
  )
}
