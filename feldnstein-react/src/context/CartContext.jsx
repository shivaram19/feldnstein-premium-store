import { createContext, useCallback, useContext, useRef, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(0)
  const [toast, setToast] = useState({ message: '', visible: false })
  const cartRef = useRef({ items: 0, total: 0 })
  const toastTimer = useRef(null)

  const showToast = useCallback(message => {
    setToast({ message, visible: true })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(
      () => setToast(t => ({ ...t, visible: false })),
      2500
    )
  }, [])

  const addToCart = useCallback(
    (name, price) => {
      const next = {
        items: cartRef.current.items + 1,
        total: cartRef.current.total + Number(price),
      }
      cartRef.current = next
      setCartItems(next.items)
      showToast(`Added to Reserve Cart — ${name} · ₹${next.total}`)
    },
    [showToast]
  )

  return (
    <CartContext.Provider value={{ cartItems, toast, showToast, addToCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
