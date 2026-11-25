import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'

/** Contact details column — store, mill, email, WhatsApp, order tracking. */
export default function FooterSupport() {
  const { setView } = useCart()
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-brand-ochre">{t('footer.support')}</h3>
      <ul className="flex flex-col gap-2.5 text-xs text-white/70">
        <li className="flex items-start gap-2"><span className="material-symbols-outlined text-sm text-brand-ochre mt-0.5">store</span><span><strong>Store:</strong> Rajendranagar 3rd Line, Main Road, Opp. ICON Mall, Guntur</span></li>
        <li className="flex items-start gap-2"><span className="material-symbols-outlined text-sm text-brand-ochre mt-0.5">factory</span><span><strong>Mill:</strong> Mothadaka, Guntur, Andhra Pradesh, India</span></li>
        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-brand-ochre">mail</span><a className="hover:text-brand-ochre transition-colors" href="mailto:contact@feldnstein.com">contact@feldnstein.com</a></li>
        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-brand-ochre">chat</span><span>WhatsApp: +91 91600 98989</span></li>
        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-brand-ochre">local_shipping</span><button className="hover:text-brand-ochre transition-colors" onClick={() => setView('track')}>Track your order</button></li>
      </ul>
    </div>
  )
}
