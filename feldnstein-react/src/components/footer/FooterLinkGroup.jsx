/**
 * Generic footer link group. Each item is either:
 *  - { label, href, external? }  — plain anchor (section anchor, mailto, external)
 *  - { label, onClick }          — SPA navigation (policy pages, order tracking)
 * Rendering both through one component keeps the two visual groups
 * (Shop / Policy & Info) pixel-identical.
 */
export default function FooterLinkGroup({ title, links }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-brand-ochre">{title}</h3>
      <ul className="flex flex-col gap-2.5 text-xs text-white/70">
        {links.map(link =>
          link.onClick ? (
            <li key={link.label}>
              <button
                className="group flex items-center gap-1.5 hover:text-brand-ochre transition-colors text-left"
                onClick={link.onClick}
              >
                <span className="text-brand-ochre text-xs" aria-hidden="true">›</span>
                {link.label}
              </button>
            </li>
          ) : (
            <li key={link.label}>
              <a
                className="group flex items-center gap-1.5 hover:text-brand-ochre transition-colors"
                href={link.href}
                {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <span className="text-brand-ochre text-xs" aria-hidden="true">›</span>
                {link.label}
              </a>
            </li>
          )
        )}
      </ul>
    </div>
  )
}
