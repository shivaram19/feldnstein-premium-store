/**
 * USP chip row — BUSINESS JOB: the 3-second trust scan. Before the shopper reads
 * a single paragraph, five verifiable claims answer "why is this oil different
 * from the bottle in my kitchen?" Claims must be short, specific and honest
 * (they carry our traceability story); vague superlatives erode exactly the
 * trust this row exists to build.
 */
export default function UspChips({ items }: { items: string[] }) {
  if (!items?.length) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Key facts">
      {items.map(item => (
        <li
          key={item}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-3 py-1.5 text-[11px] font-semibold text-brand-forest"
        >
          <span className="material-symbols-outlined text-sm text-brand-ochre" aria-hidden="true">verified</span>
          {item}
        </li>
      ))}
    </ul>
  )
}
