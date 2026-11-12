import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { shopApi, type Cart, type Order, type CheckoutDetails } from '../api/shopApi'

export type ShopView = 'home' | 'cart' | 'checkout' | 'track'

interface CartContextValue {
  toast: { message: string; visible: boolean }
  showToast: (message: string) => void
  cart: Cart
  loading: boolean
  addToCart: (variantId: number, name: string, price: number, sizeMl?: number) => void
  setQty: (variantId: number, qty: number) => void
  removeItem: (variantId: number) => void
  refresh: () => void
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  view: ShopView
  setView: (view: ShopView) => void
  lastOrder: Order | null
  setLastOrder: (order: Order | null) => void
  placeOrder: (details: CheckoutDetails) => Promise<Order>
  payOrder: (orderCode: string) => Promise<Order>
}

const EMPTY_CART: Cart = { lines: [], subTotal: 0, gstTotal: 0, grandTotal: 0, itemCount: 0 }

// View ↔ URL hash mapping so cart/checkout/track are real, linkable destinations
// with working back-button behavior (e-commerce norm). Section anchors (#collection
// etc.) are left to the home view and never treated as views.
const HASH_TO_VIEW: Record<string, ShopView> = { cart: 'cart', checkout: 'checkout', track: 'track' }
const VIEW_TO_HASH: Record<ShopView, string> = { home: '', cart: '#cart', checkout: '#checkout', track: '#track' }

const viewFromHash = (): ShopView => HASH_TO_VIEW[window.location.hash.slice(1)] ?? 'home'

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [view, setViewState] = useState<ShopView>(viewFromHash)
  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [toast, setToast] = useState({ message: '', visible: false })
  const toastTimer = useRef<number | undefined>(undefined)

  const setView = useCallback((next: ShopView) => {
    setViewState(next)
    const hash = VIEW_TO_HASH[next]
    if (hash !== window.location.hash) {
      window.history.pushState(null, '', hash || window.location.pathname)
    }
  }, [])

  // Back/forward and manual hash edits restore the matching view
  useEffect(() => {
    const sync = () => setViewState(viewFromHash())
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(
      () => setToast(t => ({ ...t, visible: false })),
      2600,
    )
  }, [])

  const refresh = useCallback(() => {
    shopApi
      .getCart()
      .then(setCart)
      .catch(() => setCart(EMPTY_CART))
      .finally(() => setLoading(false))
  }, [])

  useEffect(refresh, [refresh])

  const addToCart = useCallback(
    (variantId: number, name: string, price: number, sizeMl?: number) => {
      shopApi
        .addItem(variantId, 1)
        .then(next => {
          setCart(next)
          const label = sizeMl ? `${name} · ${sizeMl} ml` : name
          showToast(`Added to cart — ${label} · ₹${Number(price).toLocaleString('en-IN')}`)
        })
        .catch((e: unknown) => showToast(e instanceof Error ? e.message : 'Could not add to cart'))
    },
    [showToast],
  )

  const setQty = useCallback((variantId: number, qty: number) => {
    shopApi
      .setQty(variantId, qty)
      .then(setCart)
      .catch((e: unknown) => showToast(e instanceof Error ? e.message : 'Could not update quantity'))
  }, [showToast])

  const removeItem = useCallback((variantId: number) => {
    shopApi.removeItem(variantId).then(setCart).catch(() => undefined)
  }, [])

  const placeOrder = useCallback(async (details: CheckoutDetails) => {
    const order = await shopApi.checkout(details)
    setLastOrder(order)
    setCart(EMPTY_CART)
    localStorage.removeItem('feldnstein.cartToken')
    return order
  }, [])

  const payOrder = useCallback(async (orderCode: string) => {
    const paid = await shopApi.demoPay(orderCode)
    setLastOrder(paid)
    return paid
  }, [])

  const value: CartContextValue = {
    toast, showToast, cart, loading,
    addToCart, setQty, removeItem, refresh,
    drawerOpen, setDrawerOpen,
    view, setView,
    lastOrder, setLastOrder,
    placeOrder, payOrder,
  }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
