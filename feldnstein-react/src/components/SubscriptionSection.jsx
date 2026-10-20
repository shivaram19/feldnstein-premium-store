import Reveal from './Reveal'
import { useCart } from '../context/CartContext'

export default function SubscriptionSection() {
  const { showToast } = useCart()

  return (
    <section id="subscription" className="py-20 lg:py-24 bg-brand-warmCard border-y border-brand-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Reveal className="section-head">
          <div className="hairline-rule"></div>
          <div className="section-label"><span className="material-symbols-outlined text-sm">sync</span> 04 — Seamless Agrarian Supply</div>
          <h2 className="section-title">How FELD·N·STEIN <em>Fits in Your Day</em></h2>
          <p className="section-sub">Two simple, deliberate ways to keep clean, unadulterated cold-pressed oil running in your daily kitchen.</p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Reveal as="article" className="rounded-3xl bg-white border border-brand-border p-6 lg:p-8 flex flex-col justify-between card-lift">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-warmCard text-brand-forest text-xs font-bold uppercase tracking-wider mb-6">
                <span className="material-symbols-outlined text-sm">local_shipping</span>
                <span>On-Demand Harvest Dispatch</span>
              </div>
              <h3 className="font-serif text-2xl font-semibold text-brand-forest mb-3">Fresh Bottle On-Demand</h3>
              <p className="text-sm text-brand-subtle leading-relaxed">Order individual bottles fresh from this week's mill batch whenever your pantry runs low. Dispatched within 48 hours of pressing.</p>
              <ul className="mt-8 flex flex-col gap-3.5 text-xs sm:text-sm text-brand-forest">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-ochre text-base">check</span>
                  <span>Bottled within 48h of stone rotation</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-ochre text-base">check</span>
                  <span>Glass-safe eco-cushioned packaging</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-ochre text-base">check</span>
                  <span>Zero subscription or recurring commitment</span>
                </li>
              </ul>
            </div>
            <div className="mt-10 pt-6 border-t border-brand-border flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-brand-subtle font-bold">Pricing</span>
                <p className="font-serif text-lg font-bold text-brand-forest">From ₹600 / Bottle</p>
              </div>
              <a href="#collection" className="btn btn-primary">Order Single Bottle</a>
            </div>
          </Reveal>
          <Reveal as="article" className="rounded-3xl bg-white border-2 border-brand-ochre p-6 lg:p-8 flex flex-col justify-between card-lift relative">
            <span className="absolute -top-3.5 left-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-ochre text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">Most Popular</span>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-ochre/15 text-brand-forestDark tracking-wider uppercase mb-6">
                <span className="material-symbols-outlined text-[14px]">autorenew</span>
                <span>SAVE 10% EVERY MONTH</span>
              </div>
              <h3 className="font-serif text-2xl font-semibold text-brand-forest mb-3">Kitchen Reserve Subscription</h3>
              <p className="text-sm text-brand-subtle leading-relaxed mb-6">Automated monthly or bi-weekly refill deliveries straight from the press. Never run out of clean cooking fats while earning double loyalty points.</p>
              <ul className="flex flex-col gap-3.5 text-xs sm:text-sm text-brand-forest">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-ochre text-base">check</span>
                  <span>Automatic 10% discount locked on every recurring cycle</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-ochre text-base">check</span>
                  <span>Earn 2x reward points (1 point per ₹5 spent)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-ochre text-base">check</span>
                  <span>Pause, modify bottle varieties, or cancel anytime with 1-click on WhatsApp</span>
                </li>
              </ul>
            </div>
            <div className="mt-10 pt-6 border-t border-brand-border flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-brand-subtle font-bold block">Subscribe &amp; Save</span>
                <p className="font-serif text-lg font-bold text-brand-ochreDeep">10% Off + 2x Points</p>
              </div>
              <button
                className="btn btn-gold"
                onClick={() => showToast('Kitchen Reserve Activated — Our concierge will confirm your monthly blend selection.')}
              >
                Start Subscription
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
