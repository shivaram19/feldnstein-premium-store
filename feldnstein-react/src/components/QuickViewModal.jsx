import { useEffect, useRef } from 'react'
import { useCart } from '../context/CartContext'

export default function QuickViewModal({ product, onClose }) {
  const { addToCart } = useCart()
  const closeBtnRef = useRef(null)
  const triggerRef = useRef(null)
  const open = product !== null

  // Lock body scroll, focus the close button, handle Escape
  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()
    triggerRef.current = product.trigger || null

    const onKeyDown = e => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, product, onClose])

  const close = () => {
    onClose()
    if (triggerRef.current) {
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }

  return (
    <div
      id="quickViewModal"
      className={`fixed inset-0 z-50 ${open ? 'flex' : 'hidden'} items-center justify-center bg-brand-charcoal/60 backdrop-blur-sm p-4`}
      onClick={e => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="bg-white rounded-[2.5rem] border border-brand-border max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button
          ref={closeBtnRef}
          onClick={close}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-brand-warmCard hover:bg-brand-border flex items-center justify-center text-brand-forest transition-colors"
          aria-label="Close quick view"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="rounded-2xl bg-brand-warmCard p-6 flex items-center justify-center border border-brand-border/60">
            <img src={product?.img || ''} alt={product?.name || ''} className="max-h-64 object-contain" />
          </div>
          <div>
            <span id="modalBadge" className="text-[11px] font-bold uppercase tracking-wider text-brand-ochre block mb-1">{product?.badge || 'Cold Pressed Batch'}</span>
            <h3 id="modalTitle" className="font-serif text-2xl font-bold text-brand-forest">{product?.name || 'Product Name'}</h3>
            <p id="modalDesc" className="text-xs text-brand-subtle mt-2 leading-relaxed">{product?.desc || 'Artisanal single-origin stone churned oil.'}</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span id="modalPrice" className="font-serif text-3xl font-bold text-brand-forest">₹{product?.price ?? 625}</span>
              {product?.mrp && <span id="modalMrp" className="text-xs text-brand-subtle line-through">₹{product.mrp}</span>}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button
                id="modalAddBtn"
                className="btn btn-primary w-full text-xs font-bold uppercase tracking-wider"
                onClick={() => {
                  if (product) addToCart(product.name, product.price)
                  close()
                }}
              >
                <span className="material-symbols-outlined text-base">shopping_bag</span> Add to Reserve Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
