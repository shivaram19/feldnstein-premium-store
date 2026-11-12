import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { inr } from '../api/shopApi'
import Select from './Select'

interface SizeOption {
  variantId: number
  sku: string
  sizeMl: number
  price?: number
  priceInclGst?: number
}

/** Size/variant selector + add-to-cart button — used on product cards and the quick-view modal. */
export default function AddToCart({ product, ghost, chosen: chosenProp, onChosenChange, onAdded }: {
  product: { name: string; sizes?: SizeOption[] }
  ghost?: boolean
  chosen?: number
  onChosenChange?: (variantId: number) => void
  onAdded?: () => void
}) {
  const { addToCart } = useCart()
  const priced = (product.sizes ?? []).filter(s => s.priceInclGst != null || s.price != null)
  const [internal, setInternal] = useState<number>(priced[0]?.variantId ?? 0)
  const chosen = chosenProp ?? internal
  const current = priced.find(s => s.variantId === chosen) ?? priced[0]

  if (!current) return null
  const price = current.priceInclGst ?? current.price ?? 0

  const setChosen = (variantId: number) => {
    if (chosenProp == null) setInternal(variantId)
    onChosenChange?.(variantId)
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {priced.length > 1 && (
        <div className="flex flex-col gap-1.5 w-full text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-charcoal/60">Size</span>
          <Select
            ariaLabel="Choose size"
            value={chosen}
            onChange={setChosen}
            options={priced.map(s => ({
              value: s.variantId,
              label: `${s.sizeMl} ml — ${inr(s.priceInclGst ?? s.price ?? 0)}`,
            }))}
          />
        </div>
      )}
      <button
        className={`btn ${ghost ? 'btn-ghost' : 'btn-primary'} w-full quick-add`}
        onClick={() => {
          addToCart(current.variantId, product.name, price, current.sizeMl)
          onAdded?.()
        }}
      >
        Add to Cart · {inr(price)}
      </button>
    </div>
  )
}
