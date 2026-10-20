import Reveal from './Reveal'
import AmbientVideo from './AmbientVideo'

const INFO_CARDS = [
  {
    icon: 'location_on',
    title: 'Mothadaka Unit',
    body: 'Guntur District. Open daily for customer visits & farm tours.',
  },
  {
    icon: 'science',
    title: 'FSSAI & NABL',
    body: 'Multi-point lab checks for zero pesticide and zero hexane.',
  },
  {
    icon: 'loyalty',
    title: 'Reward Points',
    body: 'Earn 1 pt per ₹10 spent. 50 pts = ₹25 off your next order.',
  },
  {
    icon: 'opacity',
    title: 'Pure Sediments',
    body: 'Gravity settled. Natural micro-sediments prove raw purity.',
  },
]

const LINK_GROUPS = [
  {
    title: 'Shop',
    links: [
      { label: 'Bull-Pressed Groundnut Oil', href: '#collection' },
      { label: 'Sun-Dried Coconut Copra Oil', href: '#collection' },
      { label: 'Vedic Black Sesame (Til) Oil', href: '#collection' },
      { label: 'Heirloom Sunflower Seed Oil', href: '#collection' },
      { label: 'Kitchen Value 5-Litre Cans', href: '#collection' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'The 3 RPM Gaanuga Method', href: '#process' },
      { label: 'Quality & Purity Standards', href: '#matrix' },
      { label: 'Kitchen Reserve Subscription', href: '#subscription' },
      { label: 'Mothadaka Farm Tours', href: 'https://wa.me/919160098989', external: true },
      { label: 'Physician Affiliation Club', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Purity Guarantee', href: '#' },
      { label: 'Shipping & Glass Safety', href: '#' },
      { label: 'Privacy Charter', href: '#' },
      { label: 'FSSAI Lic. #10123000000000', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer id="siteFooter" className="bg-brand-forestDark text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-24 lg:pt-32 pb-12">
        <Reveal className="bg-brand-forest rounded-[2.5rem] p-8 sm:p-14 lg:p-16 relative overflow-hidden shadow-xl border border-white/10">
          <AmbientVideo
            className="ambient-video absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
            src="/assets/video/footer-heritage.mp4"
            lazy
            aria-hidden="true"
            tabIndex={-1}
          />
          <div className="absolute inset-0 bg-brand-forestDark/60 pointer-events-none"></div>
          <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-brand-forestDark/50 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-10 border-b border-white/10">
              <div className="max-w-2xl flex flex-col items-start">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-brand-ochre text-xs font-bold uppercase tracking-widest mb-6 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-ochre"></span>
                  <span>Open Heritage Farmstead</span>
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-white mb-4">
                  Not a sterile factory. <br />
                  A <span className="italic text-brand-ochre">Living Heritage Mill.</span>
                </h2>
                <p className="text-base sm:text-lg text-white/90 leading-relaxed font-sans">
                  <strong className="text-white font-semibold">100% Bull Pressed</strong> — No Heat, No Chemicals, Pure Nutrition. No machines. No shortcuts. Just an ancient bull-rotated stone press and generations of trust.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 flex-shrink-0">
                <a className="btn btn-gold group" href="#collection">
                  <span>Explore Our Oils</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </a>
                <a className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-white hover:text-brand-ochre font-semibold text-sm transition-all border border-white/20 hover:border-brand-ochre bg-white/10 backdrop-blur-sm shadow-sm" href="#process">
                  <span className="material-symbols-outlined text-lg text-brand-ochre">play_circle</span>
                  <span>Discover Our Process</span>
                </a>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {INFO_CARDS.map(card => (
                <div key={card.title} className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col justify-between hover:bg-white/15 transition-all">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-brand-ochre/20 flex items-center justify-center text-brand-ochre mb-4">
                      <span className="material-symbols-outlined text-2xl">{card.icon}</span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-white mb-1.5">{card.title}</h3>
                    <p className="text-sm text-white/80 leading-relaxed">{card.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 py-16 border-b border-white/10">
          <div className="lg:col-span-2 flex flex-col items-start pr-4 col-span-2 md:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/20 shadow-sm flex-none">
                <img alt="FELD·N·STEIN bull emblem" className="w-full h-full object-cover" src="/assets/img/logo-green.jpg" width="44" height="44" />
              </div>
              <span className="font-serif text-2xl font-medium text-white tracking-[0.12em]">FELD·N·STEIN</span>
            </div>
            <p className="text-xs sm:text-sm text-white/70 max-w-sm leading-relaxed mb-6">
              Handcrafted single-origin cold-pressed oils. Unheated, untreated, and extracted with traditional granite stone Gaanuga churners for pure bioavailability.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-bold uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-brand-ochre">verified</span> 100% Bull Rotated
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-bold uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-brand-ochre">verified</span> FSSAI Certified
              </span>
            </div>
          </div>
          {LINK_GROUPS.slice(0, 2).map(group => (
            <div key={group.title} className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-brand-ochre">{group.title}</h3>
              <ul className="flex flex-col gap-2.5 text-xs text-white/70">
                {group.links.map(link => (
                  <li key={link.label}>
                    <a
                      className="hover:text-brand-ochre transition-colors"
                      href={link.href}
                      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-brand-ochre">Support</h3>
            <ul className="flex flex-col gap-2.5 text-xs text-white/70">
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-sm text-brand-ochre mt-0.5">store</span><span><strong>Store:</strong> Rajendranagar 3rd Line, Main Road, Opp. ICON Mall, Guntur</span></li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-sm text-brand-ochre mt-0.5">factory</span><span><strong>Mill:</strong> Mothadaka, Guntur, Andhra Pradesh, India</span></li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-brand-ochre">mail</span><a className="hover:text-brand-ochre transition-colors" href="mailto:contact@feldnstein.com">contact@feldnstein.com</a></li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-brand-ochre">chat</span><span>WhatsApp: +91 91600 98989</span></li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-brand-ochre">Legal</h3>
            <ul className="flex flex-col gap-2.5 text-xs text-white/70">
              {LINK_GROUPS[2].links.map(link => (
                <li key={link.label}>
                  <a className="hover:text-brand-ochre transition-colors" href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>© 2025 FELD·N·STEIN Pure Botanical Oils Ltd. All agrarian heritage rights reserved.</p>
        </Reveal>
      </div>
    </footer>
  )
}
