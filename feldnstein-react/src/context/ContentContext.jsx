import { createContext, useContext, useEffect, useState } from 'react'
import { products as defaultProducts, categories as defaultCategories } from '../data/products'

const API_BASE = import.meta.env.VITE_SITE_API ?? ''
const ContentCtx = createContext(null)

async function fetchJson(path, timeoutMs = 5000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(API_BASE + path, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`site api ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

/** Normalize the platform /site/products payload into the storefront product shape. */
const abs = (u) => (u && !u.startsWith('http') ? API_BASE + u : u)

function normalizeProducts(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return defaultProducts
  return rows.map((p) => {
    const fallback = defaultProducts.find(
      (d) => d.id === String(p.code ?? '').toLowerCase()
        || (p.name && d.name.toLowerCase().includes(String(p.name).toLowerCase().split(' ').slice(-2).join(' ')))
        || (p.name && String(p.name).toLowerCase().includes(d.id)),
    )
    const sizes = (p.variants ?? []).map((v) => ({
      sku: v.sku,
      sizeMl: v.sizeMl,
      price: v.price != null ? Number(v.price) : undefined,
      priceInclGst: v.priceInclGst != null ? Number(v.priceInclGst) : undefined,
    }))
    const priced = sizes.filter((s) => s.priceInclGst != null || s.price != null)
    const minPrice = priced.length ? Math.min(...priced.map((s) => s.priceInclGst ?? s.price)) : (fallback?.price ?? 0)
    const maxPrice = priced.length ? Math.max(...priced.map((s) => s.priceInclGst ?? s.price)) : minPrice
    return {
      id: fallback?.id ?? String(p.code ?? p.id).toLowerCase(),
      name: p.name ?? fallback?.name ?? 'Oil',
      price: minPrice,
      priceRange: priced.length > 1 ? `₹${Math.round(minPrice)} – ₹${Math.round(maxPrice)}` : null,
      category: fallback?.category ?? 'staples',
      img: abs(p.imageUrl) ?? fallback?.img ?? '/assets/img/img-02.jpg',
      badge: p.badge ?? fallback?.badge ?? '',
      desc: p.shortDesc ?? fallback?.desc ?? '',
      longDesc: p.longDesc ?? fallback?.longDesc ?? undefined,
      sizes,
    }
  })
}

export function ContentProvider({ children }) {
  const [state, setState] = useState({
    products: defaultProducts,
    categories: defaultCategories,
    hero: null,
    banner: null,
    testimonials: null,
    ticker: null,
    live: false,
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [products, content] = await Promise.all([
          fetchJson('/site/products'),
          fetchJson('/site/content'),
        ])
        if (cancelled) return
        const hero = content['hero:main'] ? { ...content['hero:main'], imageUrl: abs(content['hero:main'].imageUrl) } : null
        const banner = content['banner:main'] ? { ...content['banner:main'], imageUrl: abs(content['banner:main'].imageUrl) } : null
        setState({
          products: normalizeProducts(products),
          categories: defaultCategories,
          hero,
          banner,
          testimonials: content['testimonials']?.items?.length ? content.testimonials.items : null,
          ticker: content['ticker:items']?.items?.length ? content['ticker:items'].items : null,
          live: true,
        })
      } catch {
        if (!cancelled) setState((s) => ({ ...s, live: false }))
      }
    })()
    return () => { cancelled = true }
  }, [])

  return <ContentCtx.Provider value={state}>{children}</ContentCtx.Provider>
}

export function useContent() {
  return useContext(ContentCtx)
}
