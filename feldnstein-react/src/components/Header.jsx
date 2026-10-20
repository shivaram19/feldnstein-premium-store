import { useEffect, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import { useScrollSpy } from '../hooks/useScrollSpy'

const NAV_LINKS = [
  { href: '#collection', label: 'Shop' },
  { href: '#matrix', label: 'Our Standard' },
  { href: '#process', label: 'Journal' },
  { href: '#subscription', label: 'Club' },
]

const SECTION_IDS = ['collection', 'matrix', 'process', 'subscription']

export default function Header() {
  const { cartItems } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuBtnRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const activeId = useScrollSpy(SECTION_IDS)

  // Sticky header shrink
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMenu = () => {
    setMenuOpen(false)
    menuBtnRef.current?.setAttribute('aria-expanded', 'false')
    menuBtnRef.current?.setAttribute('aria-label', 'Menu')
  }

  // Escape closes the mobile menu and returns focus to the toggle
  useEffect(() => {
    const onKeyDown = e => {
      if (e.key === 'Escape' && menuOpen) {
        closeMenu()
        menuBtnRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  // Outside click closes the mobile menu
  useEffect(() => {
    const onClick = e => {
      if (!menuOpen) return
      if (
        !mobileMenuRef.current?.contains(e.target) &&
        !menuBtnRef.current?.contains(e.target)
      ) {
        closeMenu()
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [menuOpen])

  const navClass = href => {
    const active = `#${activeId}` === href
    return `nav-link transition-colors ${
      active
        ? 'text-brand-forest'
        : 'text-brand-charcoal hover:text-brand-forest'
    }`
  }

  const navLinkProps = href =>
    `#${activeId}` === href ? { 'aria-current': 'location' } : {}

  return (
    <header
      id="siteHeader"
      className="sticky top-0 z-50 border-b transition-all duration-300 bg-brand-ivory/90 backdrop-blur-md border-brand-ochre/15"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div
          className={`flex items-center justify-between transition-all duration-300 ${
            scrolled ? 'h-14 lg:h-16' : 'h-16 lg:h-20'
          }`}
          id="headerInner"
        >
          <a href="#hero" className="flex items-center gap-2.5 group" aria-label="FELD·N·STEIN home">
            <span className="w-9 h-9 lg:w-10 lg:h-10 rounded-full overflow-hidden border border-brand-forest/15 shadow-sm flex-none transition-transform duration-300 group-hover:scale-105">
              <img src="/assets/img/logo-green.jpg" alt="" width="40" height="40" className="w-full h-full object-cover" />
            </span>
            <span className="font-serif text-xl lg:text-2xl font-medium text-brand-forest tracking-[0.12em]">FELD·N·STEIN</span>
          </a>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold" aria-label="Primary">
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className={navClass(href)} {...navLinkProps(href)}>
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-brand-forest hover:bg-brand-warmCard transition-colors"
              aria-label="Cart"
            >
              <span className="material-symbols-outlined">shopping_bag</span>
              <span
                id="cartCount"
                className={`absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand-ochre text-brand-forestDark text-[10px] font-bold items-center justify-center ${
                  cartItems > 0 ? 'flex' : 'hidden'
                }`}
              >
                {cartItems}
              </span>
            </button>
            <button
              ref={menuBtnRef}
              className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-brand-forest"
              aria-label={menuOpen ? 'Close menu' : 'Menu'}
              aria-expanded={menuOpen}
              aria-controls="mobileMenu"
              onClick={() => {
                setMenuOpen(open => {
                  menuBtnRef.current?.setAttribute('aria-expanded', String(!open))
                  menuBtnRef.current?.setAttribute('aria-label', !open ? 'Close menu' : 'Menu')
                  return !open
                })
              }}
            >
              <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
        <div
          ref={mobileMenuRef}
          id="mobileMenu"
          className={`lg:hidden ${menuOpen ? '' : 'hidden'} pb-4 flex flex-col gap-3 text-sm font-semibold`}
        >
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className={navClass(href)} onClick={closeMenu} {...navLinkProps(href)}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </header>
  )
}
