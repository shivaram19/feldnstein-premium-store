import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { inr } from '../api/shopApi'

interface SizeOption {
  variantId: number
  sku: string
  sizeMl: number
  price?: number
  priceInclGst?: number
}

/** Size/variant selector + add-to-cart button — used on product cards and the quick-view modal. */
export default function AddToCart({ product, ghost }: { product: { name: string; sizes?: SizeOption[] }; ghost?: boolean }) {
  const { addToCart } = useCart()
  const priced = (product.sizes ?? []).filter(s => s.priceInclGst != null || s.price != null)
  const [chosen, setChosen] = useState<number>(priced[0]?.variantId ?? 0)
  const current = priced.find(s => s.variantId === chosen) ?? priced[0]

  if (!current) return null
  const price = current.priceInclGst ?? current.price ?? 0

  return (
    <div className="flex flex-col gap-2 w-full">
      {priced.length > 1 && (
        <label className="flex items-center justify-center gap-2 text-xs text-brand-charcoal/60">
          Size
          <select
            className="input !w-auto !py-1 !px-2 text-xs"
            aria-label="Choose size"
            value={chosen}
            onChange={e => setChosen(Number(e.target.value))}
          >
            {priced.map(s => (
              <option key={s.variantId} value={s.variantId}>
                {s.sizeMl} ml — {inr(s.priceInclGst ?? s.price ?? 0)}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        className={`btn ${ghost ? 'btn-ghost' : 'btn-primary'} w-full quick-add`}
        onClick={() => addToCart(current.variantId, product.name, price, current.sizeMl)}
      >
        Add to Cart · {inr(price)}
      </button>
    </div>
  )
}
