import { useContent } from '../context/ContentContext'

const DEFAULT_ITEMS = [
  '100% Bull Rotated Gaanuga Mill',
  'Zero Chemical Refining',
  'Unrefined & Bleach-Free',
  'Glass Bottle Packaging',
]

export default function Ticker() {
  const { ticker } = useContent()
  const items = ticker && ticker.length > 0 ? ticker : DEFAULT_ITEMS

  return (
    <div id="ticker" className="w-full bg-brand-warmCard border-y border-brand-border py-4 overflow-hidden select-none">
      <div className="w-max flex motion-safe:animate-[ticker-scroll_30s_linear_infinite]">
        {[0, 1].map(half => (
          <div
            key={half}
            aria-hidden={half === 1}
            className="flex items-center gap-x-8 pr-8 text-xs uppercase tracking-widest text-brand-forest font-semibold"
          >
            {items.map(item => (
              <span key={item} className="flex items-center gap-2 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-ochre"></span> {item}
                <span className="text-brand-border">•</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
