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
    if (lazy) {
      const loader = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (!e.isIntersecting) return
            const srcEl = v.querySelector('source[data-src]')
            if (srcEl) {
              srcEl.src = srcEl.dataset.src
              v.load()
              v.play().catch(() => {})
            }
            loader.unobserve(v)
          })
        },
        { rootMargin: '300px' }
      )
      loader.observe(v)
      return () => loader.disconnect()
    }
    v.play().catch(() => {})
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
      autoPlay={!reduced && !lazy}
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
