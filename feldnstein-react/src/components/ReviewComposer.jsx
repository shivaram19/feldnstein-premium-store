import { useState } from 'react'
import { Dialog } from './ui/dialog'
import { shopApi } from '../api/shopApi'
import { oilIdFromName } from '../data/oilIds'

/**
 * ReviewComposer (ADR-0030 move 6) — the review-request entry point. Shown on
 * paid-and-beyond orders from the account page; submitting stores a pending
 * review (ADR-0028 moderation) and, when the order code matches the line,
 * earns the "Verified buyer" flag (V24). Supply for the Spiegel #7 mechanism
 * without an email/SMS pipeline — the buyer is already here.
 */
export default function ReviewComposer({ open, onClose, productName, orderCode }) {
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [author, setAuthor] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const productId = oilIdFromName(productName ?? '')

  const submit = async e => {
    e.preventDefault()
    if (!productId) {
      setError('This oil is not open for reviews yet.')
      return
    }
    setSending(true)
    setError('')
    try {
      await shopApi.submitReview({
        productId,
        authorName: author.trim() || 'Feld·n·Stein buyer',
        rating,
        title: title.trim(),
        body: body.trim(),
        orderCode,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your review')
    } finally {
      setSending(false)
    }
  }

  const close = () => {
    onClose()
    window.setTimeout(() => { setDone(false); setTitle(''); setBody(''); setError('') }, 250)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close() }}>
      <Dialog.Content className="max-w-md bg-white rounded-2xl border border-brand-border p-6 shadow-2xl" data-testid="review-composer">
        <Dialog.HiddenTitle>Write a review</Dialog.HiddenTitle>
        {done ? (
          <div className="text-center py-4">
            <span className="material-symbols-outlined text-4xl text-brand-forest">check_circle</span>
            <p className="mt-2 font-serif font-bold text-brand-forest">Thank you — review received</p>
            <p className="mt-1 text-xs text-brand-charcoal/60">
              It appears on the product page after a quick check. Your order code marks you as a verified buyer.
            </p>
            <button className="btn btn-primary w-full mt-4" onClick={close}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <h3 className="font-serif text-lg font-bold text-brand-forest">Review {productName}</h3>
            <p className="text-[11px] text-brand-charcoal/50">Order {orderCode} · appears publicly after moderation</p>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  data-testid={`review-star-${n}`}
                  onClick={() => setRating(n)}
                  className={`material-symbols-outlined text-3xl transition-colors ${n <= rating ? 'text-brand-ochre' : 'text-brand-border'}`}
                >
                  star
                </button>
              ))}
            </div>
            <input className="input" placeholder="Your name (optional)" value={author} onChange={e => setAuthor(e.target.value)} maxLength={96} data-testid="review-author" />
            <input className="input" placeholder="Headline" value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required data-testid="review-title" />
            <textarea className="input min-h-[96px]" placeholder="How is the oil? What did you cook?" value={body} onChange={e => setBody(e.target.value)} maxLength={2000} required data-testid="review-body" />
            {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
            <button className="btn btn-primary w-full" disabled={sending || !title.trim() || !body.trim()} data-testid="review-submit">
              {sending ? 'Sending…' : 'Submit review'}
            </button>
          </form>
        )}
      </Dialog.Content>
    </Dialog>
  )
}
