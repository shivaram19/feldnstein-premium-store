import Reveal from '../Reveal'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { Separator } from '../ui/separator'
import { POLICY_NAV } from '../../data/policies'
import FooterBrand from './FooterBrand'
import FooterLinkGroup from './FooterLinkGroup'
import FooterSupport from './FooterSupport'
import FooterBottom from './FooterBottom'

/**
 * Site footer, decomposed into single-responsibility segments
 * (Brand / LinkGroup / Support / Bottom). "Policy & Info" links are real
 * destinations ('#policy/<key>', ADR-0024 pattern) — no dead hrefs on a
 * trust-first store. The divider is a Radix Separator (ADR-0025).
 */
export default function Footer() {
  const { openPolicy } = useCart()
  const { t } = useLanguage()

  const shopLinks = [
    { label: 'Bull-Pressed Groundnut Oil', href: '#collection' },
    { label: 'Sun-Dried Coconut Copra Oil', href: '#collection' },
    { label: 'Vedic Black Sesame (Til) Oil', href: '#collection' },
    { label: 'Heirloom Sunflower Seed Oil', href: '#collection' },
    { label: 'Kitchen Value 5-Litre Cans', href: '#collection' },
  ]

  const policyLinks = POLICY_NAV.map(p => ({
    label: p.label,
    onClick: () => openPolicy(p.key),
  }))

  return (
    <footer id="siteFooter" className="bg-brand-forestDark text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-24 lg:pt-32 pb-12">
        <Reveal className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 py-16">
          <FooterBrand />
          <FooterLinkGroup title={t('footer.shop')} links={shopLinks} />
          <FooterLinkGroup title={t('footer.policy')} links={policyLinks} />
          <FooterSupport />
        </Reveal>
        <Separator className="bg-white/10" />
        <FooterBottom />
      </div>
    </footer>
  )
}
