import { createContext, useContext, useState, type ReactNode } from 'react'

/**
 * Vernacular-first slice (ADR-0029). Hand-written dictionary over an i18n
 * framework: the glance layer (nav, hero, CTAs, section labels, footer
 * groups) speaks Telugu when the buyer chooses it. Product content stays
 * English in this slice — said openly, not hidden.
 */

const DICTIONARY = {
  'nav.shop': { en: 'Shop', te: 'షాపు' },
  'nav.standard': { en: 'Our Standard', te: 'మా ప్రమాణం' },
  'nav.process': { en: 'Process', te: 'ప్రక్రియ' },
  'nav.subscribe': { en: 'Subscribe', te: 'సభ్యత్వం' },
  'hero.label': { en: 'Farm-Direct · Lab-Tested · Small Batch', te: 'రైతు నుండి నేరుగా · ల్యాబ్ పరీక్షిత · చిన్న బ్యాచ్' },
  'hero.headline': { en: 'Purity, verified at the source', te: 'శుద్ధి — మూలం వద్దే రుజువు' },
  'hero.subcopy': { en: 'Bull-pressed oils, crafted slowly from the finest seeds. No heat. No chemicals. Just pure oil your family can trust.', te: 'బలితో పిండిన నూనెలు — మంచి విత్తనాల నుండి నెమ్మదిగా. వేడి లేదు. రసాయనాలు లేవు. మీ కుటుంబం నమ్మే శుద్ధమైన నూనె.' },
  'hero.shopCta': { en: 'Shop the Reserve', te: 'నూనెలు చూడండి' },
  'hero.standardCta': { en: 'Our Standard', te: 'మా ప్రమాణం' },
  'hero.scrollCue': { en: 'the oils', te: 'నూనెలు' },
  'hero.chip1': { en: 'Lab-Tested Every Batch', te: 'ప్రతి బ్యాచ్‌కూ ల్యాబ్ పరీక్ష' },
  'hero.chip2': { en: 'Bull-Driven Gaanuga', te: 'బలితో నడిచే గానుగ' },
  'hero.chip3': { en: 'No Heat · No Chemicals', te: 'వేడి లేదు · రసాయనాలు లేవు' },
  'hero.caption': { en: 'Filmed at our Mothadaka mill — real footage, no AI', te: 'మా మోతదాక సాగులో చిత్రీకరించినది — నిజమైన దృశ్యాలు, AI కాదు' },
  'section.reserve': { en: '01 — The Absolute Reserve', te: '01 — మా ప్రత్యేక నూనెలు' },
  'section.process': { en: '02 — From Native Seeds to Culinary Gold', te: '02 — విత్తనం నుండి వంటకు బంగారం' },
  'section.standard': { en: '03 — Strict Transparency', te: '03 — పూర్తి పారదర్శకత' },
  'section.subscribe': { en: '04 — Seamless Agrarian Supply', te: '04 — సులభమైన సరఫరా' },
  'section.testimonials': { en: '05 — What Makes People Come Back', te: '05 — మళ్లీ మళ్లీ వచ్చేది ఎందుకో' },
  'pdp.addToCart': { en: 'Add to Cart', te: 'కార్ట్‌లో వేయండి' },
  'pdp.buyNow': { en: 'Buy Now', te: 'ఇప్పుడే కొనండి' },
  'footer.shop': { en: 'Shop', te: 'షాపు' },
  'footer.policy': { en: 'Policy & Info', te: 'విధానాలు' },
  'footer.support': { en: 'Support', te: 'సహాయం' },
  'lang.toggle': { en: 'తెలుగు', te: 'English' },
  'lang.note': { en: 'Product details stay in English for now — more Telugu coming.', te: 'ప్రొడక్ట్ వివరాలు ప్రస్తుతం Englishలో ఉంటాయి — మరిన్ని తెలుగు వస్తాయి.' },
} as const

export type Lang = 'en' | 'te'
type Key = keyof typeof DICTIONARY

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: Key) => string
}

const STORAGE_KEY = 'feldnstein.lang'

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'te' ? 'te' : 'en'
    } catch {
      return 'en'
    }
  })

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable — choice applies to this session */
    }
  }

  const t = (key: Key) => DICTIONARY[key][lang]

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
