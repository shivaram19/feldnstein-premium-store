import { useState, type FormEvent } from 'react'
import { useCustomer } from '../context/CustomerContext'
import { useCart } from '../context/CartContext'

/**
 * Passwordless sign-in (ADR-0023): one email field, no password. The link in
 * the inbox completes sign-in; the modal never blocks the guest path.
 */
export default function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { requestLink } = useCustomer()
  const { showToast } = useCart()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await requestLink(email.trim())
      setSent(true)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send the sign-in link')
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    setSent(false)
    setEmail('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-charcoal/60 backdrop-blur-sm p-4"
      onClick={e => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="bg-white rounded-3xl border border-brand-border max-w-md w-full p-6 sm:p-8 shadow-2xl relative" role="dialog" aria-modal="true" aria-label="Sign in">
        <button
          onClick={close}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-brand-warmCard hover:bg-brand-border flex items-center justify-center text-brand-forest transition-colors"
          aria-label="Close sign in"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {!sent ? (
          <>
            <h2 className="font-serif text-2xl font-bold text-brand-forest">Sign in — no password</h2>
            <p className="text-sm text-brand-charcoal/60 mt-2">
              We email you a one-tap sign-in link. It works once and expires in 15 minutes.
              Buying never requires an account.
            </p>
            <form className="mt-6 flex flex-col gap-3" onSubmit={submit} data-testid="signin-form">
              <input
                className="input"
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                data-testid="signin-email"
              />
              <button className="btn btn-primary w-full" disabled={busy || !email.trim()} data-testid="signin-submit">
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4" data-testid="signin-sent">
            <span className="material-symbols-outlined text-4xl text-brand-forest">mark_email_read</span>
            <h2 className="font-serif text-2xl font-bold text-brand-forest mt-3">Check your inbox</h2>
            <p className="text-sm text-brand-charcoal/60 mt-2">
              We sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device to
              sign in — your orders and loyalty points will be waiting.
            </p>
            <button className="btn btn-ghost mt-6" onClick={close}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
