import { useState } from 'react'
import Reveal from './Reveal'
import { useCart } from '../context/CartContext'
import { shopApi } from '../api/shopApi'
import { useLanguage } from '../context/LanguageContext'

export default function SubscriptionSection() {
  const { t } = useLanguage()
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
          <div className="section-label"><span className="material-symbols-outlined text-sm">sync</span> {t('section.subscribe')}</div>
          <h2 className="section-title">How FELD·N·STEIN <em>Fits in Your Day</em></h2>
        </Reveal>
        <Reveal as="div" className="max-w-5xl mx-auto mt-8">
          <div className="rounded-3xl bg-white border border-brand-border p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
              <div className="lg:max-w-sm">
                <h3 className="font-serif text-2xl font-semibold text-brand-forest mb-2">{t('subscribe.heading')}</h3>
                <p className="text-sm text-brand-subtle leading-relaxed">{t('subscribe.sub')}</p>
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
