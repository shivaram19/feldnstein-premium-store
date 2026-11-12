import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi, customerToken, rememberCustomer, type MeProfile } from '../api/shopApi'

export interface Customer {
  email: string
  name: string | null
}

interface CustomerContextValue {
  customer: Customer | null
  profile: MeProfile | null
  loading: boolean
  /** Email a fresh magic link (sign-in or header claim). */
  requestLink: (email: string) => Promise<void>
  /** Complete sign-in from a `#auth?t=…` link. Returns false when the link is invalid. */
  completeSignIn: (linkToken: string) => Promise<boolean>
  signOut: () => Promise<void>
  refresh: () => void
}

const CustomerContext = createContext<CustomerContextValue | null>(null)

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!customerToken()) {
      setCustomer(null)
      setProfile(null)
      setLoading(false)
      return
    }
    authApi
      .me()
      .then((me) => {
        setCustomer({ email: me.email, name: me.name })
        setProfile(me)
      })
      .catch(() => {
        rememberCustomer(null)
        setCustomer(null)
        setProfile(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // Consume a pending magic link both at load and if the hash appears later
  // (email link opened in the already-open tab fires hashchange, not a reload)
  useEffect(() => {
    let consuming = false
    const consume = () => {
      const match = window.location.hash.match(/^#auth\?t=(.+)$/)
      if (!match || consuming) return
      consuming = true
      authApi
        .verify(decodeURIComponent(match[1]))
        .then((verified) => {
          rememberCustomer(verified.token)
          window.history.replaceState(null, '', window.location.pathname)
          refresh()
        })
        .catch(() => {
          window.history.replaceState(null, '', window.location.pathname)
        })
        .finally(() => { consuming = false })
    }
    if (window.location.hash.startsWith('#auth?')) consume()
    window.addEventListener('hashchange', consume)
    return () => window.removeEventListener('hashchange', consume)
  }, [refresh])

  // Validate a stored session on load (no magic link in the URL)
  useEffect(() => {
    if (!window.location.hash.startsWith('#auth?')) refresh()
  }, [refresh])

  const requestLink = useCallback(async (email: string) => {
    await authApi.requestMagicLink(email)
  }, [])

  const completeSignIn = useCallback(async (linkToken: string) => {
    const verified = await authApi.verify(linkToken)
    rememberCustomer(verified.token)
    refresh()
    return true
  }, [refresh])

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // session may already be gone server-side — local sign-out still completes
    }
    rememberCustomer(null)
    setCustomer(null)
    setProfile(null)
  }, [])

  const value: CustomerContextValue = {
    customer, profile, loading,
    requestLink, completeSignIn, signOut, refresh,
  }
  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

export function useCustomer(): CustomerContextValue {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider')
  return ctx
}
