import { Accordion } from '../ui/accordion'

/**
 * FaqSection — BUSINESS JOB: objection handling that doubles as SEO. Every
 * question a WhatsApp concierge answers weekly earns its place here; answers
 * are written in the same honest voice (the freeze test for purity, storage
 * without preservatives). Radix Accordion: keyboard navigable, single-open
 * keeps the list scannable. Rendered only when the product carries FAQs —
 * an empty FAQ section reads as distrust, not thoroughness.
 */
export default function FaqSection({ faqs }: { faqs: { q: string; a: string }[] }) {
  if (!faqs?.length) return null
  return (
    <section className="mt-12" aria-labelledby="faq-heading" data-testid="faq-section">
      <h2 id="faq-heading" className="text-xs font-bold uppercase tracking-[0.12em] text-brand-forest border-b border-brand-border pb-2">
        Frequently Asked Questions
      </h2>
      <Accordion type="single" collapsible className="mt-2">
        {faqs.map((f, i) => (
          <Accordion.Item key={i} value={`faq-${i}`}>
            <Accordion.Trigger>{f.q}</Accordion.Trigger>
            <Accordion.Content>{f.a}</Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  )
}
