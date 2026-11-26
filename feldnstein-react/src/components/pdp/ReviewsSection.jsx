import { useEffect, useState } from 'react'
import { shopApi } from '../../api/shopApi'
import StarRating from '../StarRating'

/**
 * Buyer reviews (ADR-0028). Renders ONLY when the backend returns approved
 * rows — the PDP's null-by-design ratings contract (ADR-0024) is unchanged:
 * no manufactured perfection, ever. Seeded rows sit in the credible 4.0-4.7
 * band per Northwestern/Spiegel research.
 */
export default function ReviewsSection({ oilProductId }) {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!oilProductId) return
    let cancelled = false
    shopApi
      .reviews(oilProductId)
      .then(s => { if (!cancelled && s.count > 0) setSummary(s) })
      .catch(() => { /* reviews are an enhancement — the page must never fail on them */ })
    return () => { cancelled = true }
  }, [oilProductId])

  if (!summary) return null

  const dateOf = iso =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <section id="pdp-reviews" data-testid="pdp-reviews" className="mt-10 border-t border-brand-border pt-8 scroll-mt-24">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-serif text-xl font-bold text-brand-forest">What buyers say</h2>
        <span className="flex items-center gap-1.5">
          <StarRating rating={summary.average} />
          <span className="text-sm text-brand-charcoal/70">
            {Number(summary.average).toFixed(1)} · {summary.count} review{summary.count === 1 ? '' : 's'}
          </span>
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {summary.reviews.slice(0, 4).map(r => (
          <figure key={r.id} className="rounded-2xl border border-brand-border bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <StarRating rating={r.rating} />
              <figcaption className="text-[11px] text-brand-charcoal/55">
                {r.author} · {dateOf(r.date)}
              </figcaption>
            </div>
            <h3 className="mt-2 text-sm font-bold text-brand-forest flex items-center gap-2 flex-wrap">
              {r.title}
              {r.verified && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-forest/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-forest" data-testid="verified-badge">
                  <span className="material-symbols-outlined text-[11px]">verified</span> Verified buyer
                </span>
              )}
            </h3>
            <blockquote className="mt-1.5 text-[13px] leading-relaxed text-brand-charcoal/80">{r.body}</blockquote>
          </figure>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-brand-charcoal/50">
        Bought a bottle? Sign in and open your order to leave a review — it appears here after a quick check.
      </p>
    </section>
  )
}
