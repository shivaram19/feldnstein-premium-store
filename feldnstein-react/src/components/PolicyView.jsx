import { POLICIES } from '../data/policies'
import { useCart } from '../context/CartContext'
import { Accordion } from './ui/accordion'

/**
 * Static policy / FAQ destination for footer "Policy & Info" links
 * ('#policy/<key>' deep links, ADR-0024 pattern). Dense legalese is split
 * into scannable sections; FAQ answers stay collapsed until asked for
 * (Radix Accordion, ADR-0025).
 */
export default function PolicyView({ policyKey }) {
  const { setView } = useCart()
  const policy = POLICIES[policyKey] ?? POLICIES.faq

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
        <button
          data-testid="policy-back"
          onClick={() => setView('home')}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-forest/60 hover:text-brand-ochre transition-colors mb-8"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_back</span>
          Back to the collection
        </button>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-brand-forest mb-2">
          {policy.title}
        </h1>
        {policy.updated && (
          <p className="text-xs text-brand-charcoal/50 mb-6">{policy.updated}</p>
        )}
        {policy.intro && (
          <p className="text-sm sm:text-base leading-relaxed text-brand-charcoal/80 border-l-2 border-brand-ochre pl-4 mb-10">
            {policy.intro}
          </p>
        )}

        {policy.faqs ? (
          <Accordion type="multiple" data-testid="faq-accordion">
            {policy.faqs.map((f, i) => (
              <Accordion.Item key={i} value={`faq-${i}`}>
                <Accordion.Trigger>{f.q}</Accordion.Trigger>
                <Accordion.Content>{f.a}</Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <div className="flex flex-col gap-8">
            {policy.sections.map(s => (
              <section key={s.heading}>
                <h2 className="font-serif text-lg font-medium text-brand-forest mb-2">
                  {s.heading}
                </h2>
                <p className="text-sm leading-relaxed text-brand-charcoal/80">{s.body}</p>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
