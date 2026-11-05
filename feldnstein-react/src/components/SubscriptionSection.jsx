import { useState } from 'react'
import Reveal from './Reveal'
import { useCart } from '../context/CartContext'
import { shopApi } from '../api/shopApi'

export default function SubscriptionSection() {
  const { showToast } = useCart()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)

  const handleSubscribe = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!/.+@.+\..+/.test(trimmed)) {
      showToast('Please enter a valid email address.')
      return
    }
    setSubscribing(true)
    try {
      await shopApi.subscribe(trimmed, name.trim() || undefined)
      showToast("You're on the list.")
      setName('')
      setEmail('')
    } catch (err) {
      if (err instanceof TypeError) {
        showToast("We couldn't reach the mill — please try again in a moment.")
      } else {
        showToast(err instanceof Error && err.message ? err.message : "Subscription didn't go through — please try again.")
      }
    } finally {
      setSubscribing(false)
    }
  }

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
        <Reveal as="div" className="max-w-5xl mx-auto mt-8">
          <div className="rounded-3xl bg-white border border-brand-border p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
              <div className="lg:max-w-sm">
                <h3 className="font-serif text-2xl font-semibold text-brand-forest mb-2">Get First Press Access</h3>
                <p className="text-sm text-brand-subtle leading-relaxed">Join the harvest list for fresh-batch drops, seasonal blends, and subscriber-only offers. No noise — one thoughtful email per press cycle.</p>
              </div>
              <form onSubmit={handleSubscribe} className="flex-1 flex flex-col sm:flex-row gap-3.5" data-testid="subscribe-form">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  autoComplete="name"
                  className="flex-1 min-w-0 rounded-xl border border-brand-border bg-brand-warmCard px-4 py-3 text-sm text-brand-forest placeholder:text-brand-subtle/70 focus:outline-none focus:border-brand-ochre transition-colors"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="flex-1 min-w-0 rounded-xl border border-brand-border bg-brand-warmCard px-4 py-3 text-sm text-brand-forest placeholder:text-brand-subtle/70 focus:outline-none focus:border-brand-ochre transition-colors"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  data-testid="subscribe-submit"
                  className="btn btn-primary whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {subscribing ? 'Joining…' : 'Join the List'}
                </button>
              </form>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
