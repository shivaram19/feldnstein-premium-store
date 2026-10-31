import Reveal from './Reveal'
import { useContent } from '../context/ContentContext'

const TESTIMONIALS = [
  {
    quote: 'I\'ve been using FELD·N·STEIN\'s groundnut oil for 4 months now. The difference in taste is unbelievable — my family instantly noticed it in everyday cooking.',
    detail: 'Traditional monolithic stone press oil with pure authentic aroma and zero chemical impurities.',
    initials: 'AM',
    avatarClass: 'bg-brand-forest text-white',
    name: 'Dr. Arjun Mehta',
    meta: 'Verified Household • Guntur',
    badge: 'Verified',
  },
  {
    quote: 'The coconut oil is the real deal — thick, fragrant, solidifies in cold weather exactly like it should! We\'ve subscribed to the monthly plan and it\'s been one of the best decisions of this year.',
    detail: 'Delivered fresh in apothecary glass bottles directly to our doorstep on monthly automated refill.',
    initials: 'S',
    avatarClass: 'bg-brand-ochre text-brand-forestDark',
    name: 'Sunita',
    meta: 'Monthly Subscriber • Amaravati',
    badge: 'Reserve Club',
  },
  {
    quote: 'As a nutritionist, I\'m very particular about the oils I recommend to my patients. FELD·N·STEIN\'s sesame oil is the only brand I trust — stone-pressed certified with zero chemical residues.',
    detail: 'Stone pressed using traditional Gaanuga crushing. Zero chemical residues, no argemone, and no synthetic additives.',
    initials: 'MV',
    avatarClass: 'bg-brand-forestDark text-white',
    name: 'Dr. Mahesh Varma',
    meta: 'Nutritionist & Wellness Consultant',
    badge: 'Doctor Verified',
  },
]

const AVATAR_CLASSES = [
  'bg-brand-forest text-white',
  'bg-brand-ochre text-brand-forestDark',
  'bg-brand-forestDark text-white',
]

function initialsOf(name) {
  return (name || '?').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function Stars() {
  return (
    <div className="flex items-center gap-1 mb-4" role="img" aria-label="Rated 5 out of 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="material-symbols-outlined text-base text-brand-forest"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          star
        </span>
      ))}
    </div>
  )
}

export default function TestimonialsSection() {
  const { testimonials } = useContent()
  const items = testimonials && testimonials.length > 0
    ? testimonials.map((t, i) => ({
        quote: t.quote,
        detail: '',
        initials: initialsOf(t.author),
        avatarClass: AVATAR_CLASSES[i % AVATAR_CLASSES.length],
        name: t.author,
        meta: t.location || 'Verified Customer',
        badge: 'Verified',
      }))
    : TESTIMONIALS
  return (
    <section id="testimonials" className="py-20 lg:py-24 bg-white border-y border-brand-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Reveal className="section-head">
          <div className="hairline-rule"></div>
          <div className="section-label"><span className="material-symbols-outlined text-sm">reviews</span> 05 — What Makes People Come Back</div>
          <h2 className="section-title">What Makes People Come Back <em>at FELD·N·STEIN</em></h2>
          <p className="section-sub">Unsolicited feedback from physicians, culinary artists, and conscious families across Andhra Pradesh.</p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map(t => (
            <Reveal as="article" key={t.name} className="rounded-2xl bg-white border border-brand-border p-6 flex flex-col card-lift">
              <Stars />
              <p className="font-serif text-lg italic text-brand-charcoal leading-relaxed mb-4">“{t.quote}”</p>
              <p className="text-sm text-brand-subtle leading-relaxed flex-1">{t.detail}</p>
              <div className="mt-6 pt-5 border-t border-brand-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full font-serif font-bold flex items-center justify-center text-sm shadow-sm ${t.avatarClass}`}>
                    {t.initials}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-brand-forest">{t.name}</h3>
                    <span className="text-xs text-brand-subtle font-medium">{t.meta}</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-forest bg-brand-warmCard px-2.5 py-1 rounded-full border border-brand-border/60">
                  <span className="material-symbols-outlined text-xs text-brand-ochre">verified</span>{t.badge}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
