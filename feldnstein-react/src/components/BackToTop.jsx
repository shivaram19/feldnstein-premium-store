import { useEffect, useState } from 'react'

/**
 * Back-to-top control (ADR-0027). A long single-page storefront loses
 * orientation on mobile scroll; the control restores the "entrance" without
 * gesture gymnastics. Placed bottom-LEFT because WhatsAppFloat owns the
 * bottom-right — no target competition (Fitts's Law applied between
 * components, not just within them).
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-40 w-11 h-11 rounded-full bg-brand-forest text-white shadow-lg hover:bg-brand-ochre hover:text-brand-forestDark transition-colors flex items-center justify-center"
    >
      <span className="material-symbols-outlined text-xl" aria-hidden="true">arrow_upward</span>
    </button>
  )
}
