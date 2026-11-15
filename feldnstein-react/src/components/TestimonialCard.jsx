import Reveal from './Reveal'
import StarRating from './StarRating'

const AVATAR_CLASSES = [
  'bg-brand-forest text-white',
  'bg-brand-ochre text-brand-forestDark',
  'bg-brand-forestDark text-white',
]

function initialsOf(name) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function CustomerAvatar({ name, src, index }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name} avatar` : 'Customer avatar'}
        className="w-11 h-11 rounded-full object-cover shadow-sm flex-none"
      />
    )
  }
  return (
    <div className={`w-11 h-11 rounded-full font-serif font-bold flex items-center justify-center text-sm shadow-sm flex-none ${AVATAR_CLASSES[index % AVATAR_CLASSES.length]}`}>
      {name ? initialsOf(name) : <span className="material-symbols-outlined text-lg">person</span>}
    </div>
  )
}

export default function TestimonialCard({ testimonial, index = 0 }) {
  const { rating, review, customerName, orderCount, avatar } = testimonial
  return (
    <Reveal as="article" className="rounded-2xl bg-white border border-brand-border p-6 flex flex-col card-lift">
      <div className="mb-4">
        <StarRating rating={rating} />
      </div>
      {review && <p className="font-serif text-lg italic text-brand-charcoal leading-relaxed mb-4">“{review}”</p>}
      <div className="mt-auto pt-5 border-t border-brand-border/60 flex items-center gap-3">
        <CustomerAvatar name={customerName} src={avatar} index={index} />
        <div>
          {customerName && <h3 className="text-sm font-bold text-brand-forest">{customerName}</h3>}
          {orderCount != null && (
            <span className="text-xs text-brand-subtle font-medium">
              {orderCount} {orderCount === 1 ? 'order' : 'orders'} placed
            </span>
          )}
        </div>
      </div>
    </Reveal>
  )
}
