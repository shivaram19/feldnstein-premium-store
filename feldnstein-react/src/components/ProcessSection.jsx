import Reveal from './Reveal'
import AmbientVideo from './AmbientVideo'
import { assetUrl } from '../api/shopApi'

// Steps 01 + 02 both land on the first card (sourcing covers seed prep);
// 03 -> second, 04 -> third, 05 -> fourth.
const STEP_TARGETS = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4 }

function ProcessDiagram() {
  const goToProcessStep = step => {
    const card = document.getElementById(`process-step-${STEP_TARGETS[step]}`)
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const stepProps = n => ({
    className: 'process-step',
    'data-process-step': n,
    role: 'button',
    tabIndex: 0,
    'aria-label': `Step 0${n} — scroll to process card`,
    onClick: () => goToProcessStep(n),
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        goToProcessStep(n)
      }
    },
  })

  return (
    <svg viewBox="0 0 800 760" className="w-full h-auto" role="img" aria-label="Five-step process: farm sourced, hand cleaned, bull pressed, cloth filtered, bottled">
      <defs>
        <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#184e32" />
        </marker>
      </defs>
      <g stroke="#184e32" strokeWidth="2" strokeDasharray="7 8" opacity="0.5" fill="none">
        <path d="M 425 146 A 235 235 0 0 1 614 284" markerEnd="url(#flow-arrow)" />
        <path d="M 630 332 A 235 235 0 0 1 558 554" markerEnd="url(#flow-arrow)" />
        <path d="M 517 584 A 235 235 0 0 1 283 584" markerEnd="url(#flow-arrow)" />
        <path d="M 242 554 A 235 235 0 0 1 170 332" markerEnd="url(#flow-arrow)" />
        <path d="M 186 284 A 235 235 0 0 1 375 146" markerEnd="url(#flow-arrow)" />
      </g>
      <circle cx="400" cy="380" r="108" stroke="#c59b27" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.85" fill="none" />
      {/* Fixed central press */}
      <g id="ghani-press">
        <path d="M336 396 A64 46 0 0 0 464 396" fill="#184e32" fillOpacity=".10" stroke="#184e32" strokeWidth="7" strokeLinecap="round" />
        <circle cx="400" cy="380" r="10" fill="#C59B27" stroke="#184e32" strokeWidth="3" />
        <path d="M400 380 L400 324" stroke="#184e32" strokeWidth="12" strokeLinecap="round" />
      </g>
      <text x="400" y="462" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="18" fontWeight="600" fill="#184e32" stroke="#ffffff" strokeWidth="6" paintOrder="stroke">Bull Pressed</text>
      <text x="400" y="482" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="10" letterSpacing="2.5" fill="#717972" stroke="#ffffff" strokeWidth="5" paintOrder="stroke">3 RPM · STONE CHURN</text>
      <g {...stepProps(1)}>
        <circle cx="400" cy="145" r="19" fill="#184e32" />
        <text x="400" y="150" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="12" fontWeight="700" fill="#ffffff">01</text>
        <text x="400" y="100" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="17" fontWeight="600" fill="#184e32">FARM SOURCED</text>
        <text x="400" y="118" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="10.5" letterSpacing="1" fill="#717972">GUNTUR TERRACES</text>
      </g>
      <g {...stepProps(2)}>
        <circle cx="624" cy="307" r="19" fill="#184e32" />
        <text x="624" y="312" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="12" fontWeight="700" fill="#ffffff">02</text>
        <text x="652" y="300" textAnchor="start" fontFamily="Newsreader, Georgia, serif" fontSize="17" fontWeight="600" fill="#184e32">HAND CLEANED</text>
        <text x="652" y="318" textAnchor="start" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="10.5" letterSpacing="1" fill="#717972">HAND-CLEANED SEEDS</text>
      </g>
      <g {...stepProps(3)}>
        <circle cx="538" cy="570" r="19" fill="#c59b27" />
        <text x="538" y="575" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="12" fontWeight="700" fill="#ffffff">03</text>
        <text x="558" y="596" textAnchor="start" fontFamily="Newsreader, Georgia, serif" fontSize="17" fontWeight="600" fill="#184e32">BULL PRESSED</text>
        <text x="558" y="614" textAnchor="start" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="10.5" letterSpacing="1" fill="#717972">GIR BULL CHURN</text>
      </g>
      <g {...stepProps(4)}>
        <circle cx="262" cy="570" r="19" fill="#184e32" />
        <text x="262" y="575" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="12" fontWeight="700" fill="#ffffff">04</text>
        <text x="242" y="596" textAnchor="end" fontFamily="Newsreader, Georgia, serif" fontSize="17" fontWeight="600" fill="#184e32">CLOTH FILTERED</text>
        <text x="242" y="614" textAnchor="end" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="10.5" letterSpacing="1" fill="#717972">48-HR SETTLING</text>
      </g>
      <g {...stepProps(5)}>
        <circle cx="176" cy="307" r="19" fill="#184e32" />
        <text x="176" y="312" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="12" fontWeight="700" fill="#ffffff">05</text>
        <text x="148" y="300" textAnchor="end" fontFamily="Newsreader, Georgia, serif" fontSize="17" fontWeight="600" fill="#184e32">BOTTLED</text>
        <text x="148" y="318" textAnchor="end" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="10.5" letterSpacing="1" fill="#717972">APOTHECARY GRADE</text>
      </g>
    </svg>
  )
}

const STEP_CARDS = [
  {
    id: 1,
    num: '01',
    media: { type: 'img', src: assetUrl('/assets/img/img-06.jpg'), alt: 'Heirloom Seeds Sun-Drying on Guntur Terraces' },
    phase: 'Phase 01',
    icon: 'solar_power',
    tag: 'Guntur Terraces',
    tagHighlight: false,
    title: 'Sourcing & Sun-Drying',
    body: 'Single-origin heirloom seeds hand-sorted and dried under natural sunlight. Zero chemical fumigation or pesticides.',
    footerIcon: 'check_circle',
    footer: 'Heirloom Pods',
    footerNote: 'Zero Chemicals',
  },
  {
    id: 2,
    num: '02',
    media: {
      type: 'video',
      src: assetUrl('/assets/video/process-press.mp4'),
      poster: assetUrl('/assets/img/img-07.png'),
      alt: 'Traditional Monolithic Stone Gaanuga Mill Press',
      aria: 'Bulls circling the traditional stone gaanuga mill press',
    },
    phase: 'Phase 02',
    icon: 'cyclone',
    tag: 'Gir Bull Churn',
    tagHighlight: true,
    ribbon: 'Core Pillar',
    title: '3 RPM Bull Pressing',
    body: 'Monolithic granite pestle turned slowly at 3 RPM. Cold crushing strictly caps heat below 38°C to keep enzymes intact.',
    footerIcon: 'thermostat',
    footer: '<38°C Friction Heat',
    footerNote: 'Active Enzymes',
  },
  {
    id: 3,
    num: '03',
    media: { type: 'img', src: assetUrl('/assets/img/img-08.jpg'), alt: '48-Hour Gravity Sedimentation Settling' },
    phase: 'Phase 03',
    icon: 'hourglass_empty',
    tag: '48-Hr Settling',
    tagHighlight: false,
    title: 'Gravity Sedimentation',
    body: 'Fresh raw oil rests in food-grade steel vats. Natural gravity clarifies without micro-filters, deodorizers, or bleaching clays.',
    footerIcon: 'filter_vintage',
    footer: 'Zero Micro-Filters',
    footerNote: '100% Raw Clarity',
  },
  {
    id: 4,
    num: '04',
    media: {
      type: 'video',
      src: assetUrl('/assets/video/process-pour.mp4'),
      poster: assetUrl('/assets/img/img-09.jpg'),
      alt: 'Amber Glass Apothecary Bottling',
      aria: 'Fresh-pressed golden oil pouring into a steel settling bowl',
    },
    phase: 'Phase 04',
    icon: 'shield',
    tag: 'Apothecary Grade',
    tagHighlight: false,
    title: 'Amber Glass Bottling',
    body: 'Hand-decanted into UV-protective pharmaceutical amber glass to prevent oxidation and eradicate microplastic leaching.',
    footerIcon: 'sanitizer',
    footer: '100% UV Barrier',
    footerNote: 'Plastic-Free',
  },
]

function StepCard({ card }) {
  return (
    <Reveal
      as="article"
      id={`process-step-${card.id}`}
      className="scroll-mt-24 rounded-2xl bg-white border border-brand-border p-6 flex flex-col justify-between card-lift card-img-zoom overflow-hidden relative"
    >
      {card.ribbon && (
        <span className="absolute top-0 right-0 bg-brand-forest text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-bl-xl z-10 shadow-sm">{card.ribbon}</span>
      )}
      <div>
        <div className="relative w-full h-56 rounded-xl bg-brand-warmCard overflow-hidden mb-5 border border-brand-border/60 flex items-center justify-center">
          {card.media.type === 'video' ? (
            <AmbientVideo
              className="ambient-video w-full h-full object-cover"
              src={card.media.src}
              poster={card.media.poster}
              ariaLabel={card.media.aria}
              lazy
            />
          ) : (
            <img loading="lazy" src={card.media.src} alt={card.media.alt} className="w-full h-full object-cover transition-transform duration-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
          <span className="absolute top-3 left-3 bg-brand-forest/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 shadow-sm">{card.phase}</span>
          <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur-md text-brand-forest flex items-center justify-center shadow-md">
            <span className={`material-symbols-outlined text-lg ${card.tagHighlight ? 'text-brand-forest' : 'text-brand-ochre'}`}>{card.icon}</span>
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-serif text-3xl font-bold text-brand-ochre leading-none">{card.num}</span>
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
            card.tagHighlight
              ? 'text-brand-forestDark bg-brand-ochre/20 border-brand-ochre/30'
              : 'text-brand-subtle bg-brand-warmCard border-brand-border/60'
          }`}>{card.tag}</span>
        </div>
        <h3 className="font-serif text-xl font-bold text-brand-forest mb-2.5 leading-snug">{card.title}</h3>
        <p className="text-xs sm:text-sm text-brand-subtle leading-relaxed mb-4">{card.body}</p>
      </div>
      <div className="pt-4 border-t border-brand-border/60 flex items-center justify-between text-[11px] font-semibold text-brand-forest">
        <span className="inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-brand-ochre">{card.footerIcon}</span>
          {card.footer}
        </span>
        <span className="text-brand-subtle font-normal">{card.footerNote}</span>
      </div>
    </Reveal>
  )
}

export default function ProcessSection() {
  return (
    <section id="process" className="py-20 lg:py-24 bg-white border-y border-brand-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Reveal className="section-head">
          <div className="hairline-rule"></div>
          <div className="section-label"><span className="material-symbols-outlined text-sm">history_edu</span> 01 — From Native Seeds to Culinary Gold</div>
          <h2 className="section-title">From Native Seed to <em>Apothecary Bottle</em></h2>
          <p className="section-sub">An ancient Gaanuga sequence that refuses modern shortcuts. Here is exactly how your oil is born.</p>
        </Reveal>
        <Reveal className="max-w-2xl mx-auto mb-16">
          <ProcessDiagram />
          <p className="text-center text-xs text-brand-subtle mt-4 tracking-wide">Farm sourced → hand cleaned → bull pressed → cloth filtered → bottled.</p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEP_CARDS.map(card => (
            <StepCard key={card.id} card={card} />
          ))}
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#matrix" className="btn btn-primary">Explore Our 4-Step Process <span className="material-symbols-outlined text-base">arrow_forward</span></a>
          <a href="https://wa.me/919160098989?text=Hi%2C%20I%20would%20like%20to%20learn%20more%20about%20the%20Mothadaka%20mill%20process." target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><span className="material-symbols-outlined text-base text-brand-ochre">verified</span> Learn More About Our Process</a>
        </div>
      </div>
    </section>
  )
}
