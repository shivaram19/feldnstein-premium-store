import Reveal from './Reveal'
import { useCart } from '../context/CartContext'
import { assetUrl } from '../api/shopApi'

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
  const { setView } = useCart()
  return (
    <footer id="siteFooter" className="bg-brand-forestDark text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-24 lg:pt-32 pb-12">
        <Reveal className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 py-16 border-b border-white/10">
          <div className="lg:col-span-2 flex flex-col items-start pr-4 col-span-2 md:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/20 shadow-sm flex-none">
                <img alt="FELD·N·STEIN bull emblem" className="w-full h-full object-cover" src={assetUrl('/assets/img/logo-green.jpg')} width="44" height="44" />
              </div>
              <span className="font-serif text-2xl font-medium text-white tracking-[0.12em]">FELD·N·STEIN</span>
            </div>
            <p className="text-xs sm:text-sm text-white/70 max-w-sm leading-relaxed mb-6">
              Handcrafted single-origin cold-pressed oils. Unheated, untreated, and extracted with traditional granite stone Gaanuga churners for pure bioavailability.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-bold uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-brand-ochre">verified</span> Lab Verified · Batch 042
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-bold uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-brand-ochre">shield</span> FSSAI Certified Mill
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
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-brand-ochre">local_shipping</span><button className="hover:text-brand-ochre transition-colors" onClick={() => setView('track')}>Track your order</button></li>
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
