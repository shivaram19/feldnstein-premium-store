import Reveal from './Reveal'
import TestimonialCard from './TestimonialCard'
import { useContent } from '../context/ContentContext'
import { testimonialSubtitle } from '../data/testimonials'

export default function TestimonialsSection() {
  const { testimonials } = useContent()
  const items = Array.isArray(testimonials) ? testimonials : []

  return (
    <section id="testimonials" className="py-20 lg:py-24 bg-white border-y border-brand-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Reveal className="section-head">
          <div className="hairline-rule"></div>
          <div className="section-label"><span className="material-symbols-outlined text-sm">reviews</span> 05 — What Makes People Come Back</div>
          <h2 className="section-title">What Makes People Come Back <em>at FELD·N·STEIN</em></h2>
          {testimonialSubtitle && <p className="section-sub">{testimonialSubtitle}</p>}
        </Reveal>
        {items.length === 0 ? (
          <Reveal className="rounded-2xl bg-white border border-brand-border p-10 md:p-14 text-center">
            <span className="material-symbols-outlined text-3xl text-brand-ochre mb-3 inline-block">rate_review</span>
            <p className="font-serif text-lg text-brand-charcoal">Genuine customer reviews will appear here soon.</p>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((t, i) => (
              <TestimonialCard key={t.id ?? i} testimonial={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
