export interface ComparisonOil {
  id: string
  name: string
  hrefPrice?: string
  uses: string[]
  weather: string
  goodFor: string
  nutrients: string
  aroma: string
  flavour: string
}

/**
 * ComparisonTable — BUSINESS JOB: whole-catalog cross-sell. Turns "is THIS the
 * right oil?" into "which of OUR oils is right?" — the highest-value question
 * a PDP can answer, and the pattern that owns comparison-search SEO. Row
 * headers are sticky (wide-table scanning on mobile), the current product's
 * column is highlighted, and every column deep-links to that oil's PDP — the
 * table is navigation, not a dead end. Rendered only with 2+ oils.
 */
export default function ComparisonTable({ currentId, oils }: { currentId: string; oils: ComparisonOil[] }) {
  const highlight = currentId
  if (!oils || oils.length < 2) return null

  const rows: { label: string; key: keyof ComparisonOil }[] = [
    { label: 'Best uses', key: 'uses' },
    { label: 'Suits weather', key: 'weather' },
    { label: 'Good for', key: 'goodFor' },
    { label: 'Nutrients (per serving)', key: 'nutrients' },
    { label: 'Aroma', key: 'aroma' },
    { label: 'Flavour', key: 'flavour' },
  ]
  const [first, ...rest] = [oils.find(o => o.id === highlight), ...oils.filter(o => o.id !== highlight)].filter(Boolean) as ComparisonOil[]

  return (
    <section className="mt-14" aria-labelledby="compare-heading" data-testid="comparison-table">
      <div className="hairline-rule" />
      <p className="section-label">Find Your Oil</p>
      <h2 id="compare-heading" className="section-title">Which <em>reserve</em> oil is yours?</h2>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-brand-border bg-white">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b border-brand-border">
              <th scope="col" className="sticky left-0 bg-white text-left p-4 font-bold uppercase tracking-wider text-brand-charcoal/50 w-28">Attribute</th>
              {[first, ...rest].map(o => (
                <th key={o.id} scope="col" className={`p-4 text-left ${o.id === highlight ? 'bg-brand-forest/5' : ''}`}>
                  <a href={`#product/${o.id}`} className={`font-serif text-sm font-bold hover:underline ${o.id === highlight ? 'text-brand-forest' : 'text-brand-charcoal'}`}>
                    {o.name}{o.id === highlight ? ' ·' : ''}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, key }) => (
              <tr key={label} className="border-b border-brand-border/60 last:border-0 align-top">
                <th scope="row" className="sticky left-0 bg-white p-4 text-left font-bold uppercase tracking-wider text-brand-charcoal/50">{label}</th>
                {[first, ...rest].map(o => (
                  <td key={o.id} className={`p-4 leading-relaxed text-brand-charcoal/85 ${o.id === highlight ? 'bg-brand-forest/5' : ''}`}>
                    {key === 'uses' ? (
                      <span className="flex flex-wrap gap-1">
                        {(o.uses as string[]).map(u => (
                          <span key={u} className="rounded-full bg-brand-warmCard border border-brand-border/70 px-2 py-0.5 text-[10px] font-semibold">{u}</span>
                        ))}
                      </span>
                    ) : String(o[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
