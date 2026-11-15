export default function StarRating({ rating }) {
  const value = Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : null
  return (
    <div className="flex items-center gap-1" role="img" aria-label={value ? `Rated ${value} out of 5` : 'No rating'}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`material-symbols-outlined text-base ${value && i < value ? 'text-brand-forest' : 'text-brand-border'}`}
          style={{ fontVariationSettings: value && i < value ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      ))}
    </div>
  )
}
