import { useEffect, useState } from 'react'

// Scroll-position based scrollspy: at the hero (above the first nav target)
// nothing is highlighted. Targets are evaluated in document order.
export function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    let ticking = false

    const update = () => {
      ticking = false
      const probe = window.scrollY + window.innerHeight * 0.38
      let current = null
      const targets = ids
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .sort(
          (a, b) =>
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        )
      for (const t of targets) {
        if (t.getBoundingClientRect().top + window.scrollY <= probe) current = t.id
      }
      setActiveId(current)
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ids])

  return activeId
}
