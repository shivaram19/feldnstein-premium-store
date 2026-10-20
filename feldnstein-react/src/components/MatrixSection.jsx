import Reveal from './Reveal'

const ROWS = [
  {
    icon: 'thermostat',
    title: 'Heat & Friction',
    sub: 'Extraction Temperature',
    commercial: '200°C High Heat',
    commercialDesc: 'Thermal deodorization induces lipid oxidation & degrades heat-sensitive antioxidants.',
    artisanal: '<38°C Natural Cold Press',
    artisanalDesc: 'Slow 3 RPM monolithic granite naturally dissipates friction, keeping active enzymes intact.',
  },
  {
    icon: 'science',
    title: 'Extraction Agents',
    sub: 'Solvents & Refining',
    commercial: 'Hexane & Caustic Soda',
    commercialDesc: 'Petroleum solvents & acid wash applied to artificially force commercial yield.',
    artisanal: '100% Bull Pressing',
    artisanalDesc: 'Zero chemical interventions. Sun-dried heirloom seeds crushed solely by stone weight.',
  },
  {
    icon: 'hourglass_empty',
    title: 'Clarification & Nutrients',
    sub: 'Filtration Standard',
    commercial: 'Synthetic Dewaxing',
    commercialDesc: 'Stripped of naturally occurring aromatics, micronutrients, beta-carotene, and tocopherols.',
    artisanal: '48-Hr Gravity Settling',
    artisanalDesc: 'Steel vat resting preserves authentic nutty fragrance, living sesamol, and bio-available sterols.',
  },
  {
    icon: 'shield',
    title: 'Bottle Packaging',
    sub: 'Leaching Protection',
    commercial: 'Thin PET Plastic',
    commercialDesc: 'Oils absorb endocrine disruptors and microplastics under transit heat and sunlight.',
    artisanal: 'Pharmaceutical Amber Glass',
    artisanalDesc: 'Chemically inert UV barrier blocks photo-oxidation with zero phthalate or microplastic leaching.',
  },
]

export default function MatrixSection() {
  return (
    <section id="matrix" className="py-20 lg:py-24 bg-brand-warmCard">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Reveal className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10 mb-14">
            <div className="max-w-xl text-left">
              <div className="hairline-rule" style={{ marginLeft: 0, marginRight: 0 }}></div>
              <div className="section-label"><span className="material-symbols-outlined text-sm">balance</span> 02 — Strict Transparency</div>
              <h2 className="section-title !text-left">What Goes Into Your Cooking <em>Matters</em></h2>
              <p className="section-sub !mt-3">Industrial commercial oils prioritize infinite shelf-life over bioavailability. Compare the essential truth side-by-side.</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-brand-border">
              <div className="md:col-span-4 p-5 sm:p-6 bg-brand-warmCard/70 flex items-center border-b md:border-b-0 md:border-r border-brand-border">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-subtle">Standard &amp; Parameter</span>
              </div>
              <div className="md:col-span-4 p-5 sm:p-6 bg-brand-rust/15 flex items-center justify-between border-b md:border-b-0 md:border-r border-brand-border">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-rust"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-rust">Commercial Baseline</span>
                </div>
                <span className="text-[11px] text-brand-subtle font-medium">Refined Seed Oils</span>
              </div>
              <div className="md:col-span-4 p-5 sm:p-6 bg-brand-forest text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-ochre"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Vedic Gaanuga Mill</span>
                </div>
                <span className="text-[11px] text-white/90 font-medium">FELD·N·STEIN Artisanal</span>
              </div>
            </div>
            <div className="divide-y divide-brand-border/60">
              {ROWS.map(row => (
                <div key={row.title} className="grid grid-cols-1 md:grid-cols-12 transition-colors hover:bg-brand-warmCard/30">
                  <div className="md:col-span-4 p-5 sm:p-6 flex items-start gap-3.5 bg-brand-warmCard/30 md:bg-transparent border-b md:border-b-0 md:border-r border-brand-border/60">
                    <div className="w-9 h-9 rounded-full bg-brand-ochre/20 text-brand-forest flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-lg">{row.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-brand-forest leading-snug">{row.title}</h3>
                      <p className="text-xs text-brand-subtle mt-0.5">{row.sub}</p>
                    </div>
                  </div>
                  <div className="md:col-span-4 p-5 sm:p-6 bg-brand-rust/15 md:border-r border-brand-border/60 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="material-symbols-outlined text-base text-brand-rust flex-shrink-0">close</span>
                      <span className="text-sm font-bold text-brand-charcoal/80">{row.commercial}</span>
                    </div>
                    <p className="text-xs text-brand-subtle leading-relaxed">{row.commercialDesc}</p>
                  </div>
                  <div className="md:col-span-4 p-5 sm:p-6 bg-brand-forest flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="material-symbols-outlined text-base text-brand-ochre flex-shrink-0">check_circle</span>
                      <span className="text-sm font-bold text-white">{row.artisanal}</span>
                    </div>
                    <p className="text-xs text-white/75 leading-relaxed">{row.artisanalDesc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-brand-forestDark px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-white/85 text-center sm:text-left"><strong className="text-white font-semibold">Every parameter above ships with each bottle</strong> — batch lab report included.</p>
              <a href="#collection" className="btn btn-gold flex-shrink-0">Shop the Reserve <span className="material-symbols-outlined text-base">arrow_forward</span></a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
