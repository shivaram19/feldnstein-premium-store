import { assetUrl } from '../../api/shopApi'
import FooterSocial from './FooterSocial'

/** Brand column: emblem, positioning line, trust badges, socials. */
export default function FooterBrand() {
  return (
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
      <FooterSocial />
    </div>
  )
}
