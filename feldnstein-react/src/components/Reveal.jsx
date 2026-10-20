import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export default function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced) {
      el.classList.add('is-revealed')
      return
    }
    // Stagger by index among data-reveal siblings within the same parent
    let index = 0
    let sib = el.previousElementSibling
    while (sib) {
      if (sib.hasAttribute('data-reveal')) index += 1
      sib = sib.previousElementSibling
    }
    el.style.transitionDelay = `${Math.min(index * 80, 400)}ms`
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-revealed')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [reduced])

  return (
    <Tag ref={ref} data-reveal className={className} {...rest}>
      {children}
    </Tag>
  )
}
