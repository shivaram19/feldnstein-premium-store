import { useState } from 'react'
import { Dialog } from '../ui/dialog'

/**
 * Gallery — BUSINESS JOB: the closest thing to touching the bottle online.
 * Thumbnail-first (mobile data discipline), tap-to-zoom lightbox via Radix
 * Dialog (focus trap + Escape + scroll lock for free). The stage image keeps
 * its stable test id — smoke tests depend on it.
 */
export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  if (!images.length) return null

  return (
    <div className="lg:sticky lg:top-24">
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <Dialog.Trigger asChild>
          <button
            className="block w-full rounded-3xl border border-brand-border bg-white overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ochre"
            aria-label={`Enlarge image ${idx + 1} of ${images.length}`}
          >
            <img id="detailMainImg" src={images[idx]} alt={alt} className="w-full aspect-square object-cover" />
          </button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.HiddenTitle>{alt} — enlarged view</Dialog.HiddenTitle>
          <img src={images[idx]} alt={alt} className="w-full max-h-[82vh] object-contain rounded-2xl bg-black" />
        </Dialog.Content>
      </Dialog>

      {images.length > 1 && (
        <div className="mt-4 flex gap-3 flex-wrap">
          {images.map((g, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === idx}
              aria-current={i === idx ? 'true' : undefined}
              className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ochre ${i === idx ? 'border-brand-forest' : 'border-brand-border opacity-70 hover:opacity-100'}`}
            >
              <img src={g} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
