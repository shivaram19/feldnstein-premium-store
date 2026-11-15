import { RadioGroup } from '../ui/radio-group'
import { inr } from '../../api/shopApi'

export interface VariantOption {
  variantId: number
  label: string
  sizeMl?: number
  price: number
  mrp?: number | null
}

/**
 * VariantSelector — BUSINESS JOB: the PDP's most consequential interaction.
 * Radix RadioGroup gives full keyboard navigation and honest screen-reader
 * semantics; the per-litre normalizer makes size comparisons instant (the
 * shopper's real question is "which size is cheapest per litre?"). The
 * grid/listbox div it replaces announced nothing to assistive tech.
 */
export default function VariantSelector({ options, value, onChange }: {
  options: VariantOption[]
  value: number | undefined
  onChange: (variantId: number) => void
}) {
  if (!options.length) return null
  return (
    <div className="mt-6">
      <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal/70">Select Variant</span>
      <RadioGroup
        id="variantGrid"
        aria-label="Select variant"
        className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3"
        value={value}
        onValueChange={v => onChange(Number(v))}
      >
        {options.map(s => (
          <RadioGroup.Item key={s.variantId} value={String(s.variantId)} className="p-3" aria-label={`${s.label ?? `${s.sizeMl} ml`}, ${s.price} rupees`}>
            <span className="flex items-center justify-between gap-2">
              <span className="block text-xs font-semibold text-brand-charcoal">{s.label ?? `${s.sizeMl} ml`}</span>
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-brand-forest/40 transition-colors group-data-[state=checked]:border-brand-forest group-data-[state=checked]:bg-brand-forest group-data-[state=checked]:[background-clip:content-box] group-data-[state=checked]:p-[3px]" aria-hidden="true" />
            </span>
            <span className="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span className="font-serif text-lg font-bold text-brand-forest">{inr(s.price)}</span>
              {s.sizeMl ? <span className="text-[10px] text-brand-charcoal/55">₹{Math.round(s.price / (s.sizeMl / 1000))}/L</span> : null}
            </span>
            {s.mrp && s.mrp > s.price && <span className="block text-[11px] text-brand-charcoal/50 line-through">MRP {inr(s.mrp)}</span>}
          </RadioGroup.Item>
        ))}
      </RadioGroup>
    </div>
  )
}
