import { useContent } from '../context/ContentContext'

const DEFAULT_ITEMS = [
  '100% Bull Rotated Gaanuga Mill',
  'Zero Chemical Refining',
  'Unrefined & Bleach-Free',
  'Glass Bottle Packaging',
  'Direct From Mothadaka Farm',
]

export default function Ticker() {
  const { ticker } = useContent()
  const items = ticker && ticker.length > 0 ? ticker : DEFAULT_ITEMS

  return (
    <div id="ticker" className="w-full bg-brand-warmCard border-y border-brand-border py-4 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-widest text-brand-forest font-semibold text-center">
        {items.map((item, i) => (
          <span key={item} className="contents">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-ochre"></span> {item}
            </span>
            {i < items.length - 1 && (
              <span className="text-brand-border hidden md:inline">•</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
