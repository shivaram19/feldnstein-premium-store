import Switch from '../ui/switch'
import { inr } from '../../api/shopApi'

export const SUBSCRIBE_DISCOUNT_PERCENT = 10

/**
 * SubscribeSaveRow — BUSINESS JOB: the Amazon-style "Subscribe & Save" pattern
 * adapted to our Kitchen Reserve model: 10% off every recurring delivery,
 * double loyalty points, pause/modify/cancel over WhatsApp. The row sits
 * directly under the price block because that's where the shopper is already
 * doing price math. Terms are stated inline — no surprises at checkout: the
 * same flag rides the cart to the backend, which applies the real discount.
 */
export default function SubscribeSaveRow({ checked, onChange, price }: {
  checked: boolean
  onChange: (checked: boolean) => void
  price: number
}) {
  const discounted = Math.round(price * (1 - SUBSCRIBE_DISCOUNT_PERCENT / 100) * 100) / 100
  return (
    <div
      className={`mt-3 flex items-start gap-3 rounded-2xl border p-4 transition-colors ${checked ? 'border-brand-forest bg-brand-forest/5' : 'border-brand-border bg-white'}`}
      data-testid="subscribe-save"
    >
      <Switch checked={checked} onCheckedChange={onChange} ariaLabel="Subscribe and save 10 percent" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-brand-forest">
          Kitchen Reserve — Subscribe & Save
          <span className="ml-2 rounded-md bg-brand-ochre/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-ochreDeep">
            Save {SUBSCRIBE_DISCOUNT_PERCENT}%
          </span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-brand-charcoal/70">
          {inr(discounted)} per recurring delivery instead of {inr(price)} · double loyalty points ·
          monthly or bi-weekly refill · pause or change blends anytime on WhatsApp.
        </p>
      </div>
    </div>
  )
}
