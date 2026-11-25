import { inr } from '../../api/shopApi'

interface PriceBlockProps {
  price: number
  mrp?: number | null
  offer?: { label: string; code?: string; finalPrice?: number } | null
  qty: number
  loyaltyPercent?: number
}

/**
 * PriceBlock — BUSINESS JOB: offer clarity, the single biggest conversion
 * lever on an Indian D2C PDP. The ladder is always three honest tiers:
 *   MRP (anchor, struck) → our price (what the cart will charge) → offer tier
 * (coupon/prepaid discount from price-config, shown as a badge with its code —
 * never a fake countdown). When no offer exists, the ladder collapses to two
 * tiers instead of inventing one. The loyalty line converts price attention
 * into repeat-purchase intent.
 */
export default function PriceBlock({ price, mrp, offer, qty, loyaltyPercent = 5 }: PriceBlockProps) {
  const hasMrp = mrp != null && mrp > price
  const discount = hasMrp ? Math.round(((mrp - price) / mrp) * 100) : null
  const offerPrice = offer?.finalPrice != null && offer.finalPrice < price ? offer.finalPrice : null
  const points = Math.floor(((price * qty) / 100) * loyaltyPercent)

  return (
    <div className="mt-5 rounded-2xl border border-brand-border bg-brand-warmCard p-5" data-testid="price-block">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-charcoal/60">
            {offerPrice ? 'Our Price' : 'Your Price'}
          </span>
          <div className="mt-0.5 flex items-baseline gap-2.5">
            <span id="detailPrice" className="font-serif text-3xl font-bold text-brand-forest">{inr(price)}</span>
            {hasMrp && <span className="text-sm text-brand-charcoal/50 line-through">{inr(mrp)}</span>}
          </div>
        </div>
        {discount && (
          <span className="rounded-lg bg-brand-ochre/15 text-brand-ochreDeep px-3 py-1.5 text-xs font-bold whitespace-nowrap">
            {discount}% OFF
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-brand-charcoal/55">
        MRP incl. of all taxes
        {hasMrp && <> · You save {inr(mrp - price)}</>}
      </p>
      {/* Per-day cost (tension 2): the earned-premium defense — certainty
          priced in care vocabulary, never in discounts. */}
      <p className="mt-1 text-[11px] text-brand-charcoal/50">
        ≈ {inr(Math.max(1, Math.round(price / 42)))} a day at typical family use
      </p>

      {offer && (
        <div className="pdp-offer-row mt-3 flex items-center gap-2 rounded-xl bg-brand-forest px-3.5 py-2.5 text-white overflow-hidden relative" data-testid="offer-badge">
          <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none" aria-hidden="true">
            <span className="offer-shine absolute top-0 h-full w-1/3" />
          </span>
          <span className="relative z-10 text-[10px] font-bold uppercase tracking-wider opacity-80">{offer.label}</span>
          <span className="relative z-10 font-serif text-lg font-bold leading-none">{offerPrice ? inr(offerPrice) : ''}</span>
          {offer.code && (
            <span className="relative z-10 ml-auto rounded-md border border-dashed border-white/50 px-2 py-0.5 text-[11px] font-bold tracking-wide">
              {offer.code}
            </span>
          )}
        </div>
      )}

      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-brand-herb">
        <span className="material-symbols-outlined text-base" aria-hidden="true">eco</span>
        Buy now & earn {points} loyalty points instantly
      </p>
    </div>
  )
}
