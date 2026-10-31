export interface Product {
  id: number
  name: string
  sku: string
  category: string
  price: number
  stockQty: number
}

export interface StockMovement {
  id: number
  productId: number
  type: 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  reason: string
  createdAt: string
}

export interface PurchaseOrder {
  id: number
  customerEmail: string
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED'
  totalAmount: number
  createdAt: string
}

export interface LoyaltyAccount {
  id: number
  memberEmail: string
  name: string
  tier: 'BRONZE' | 'SILVER' | 'GOLD'
  pointsBalance: number
}

export interface LoyaltyTransaction {
  id: number
  accountId: number
  delta: number
  reason: string
  createdAt: string
}

export interface AnalyticsSummary {
  productCount: number
  totalStockUnits: number
  orderCount: number
  revenuePaid: number
  loyaltyMembers: number
  pointsOutstanding: number
}

const AUTH_KEY = 'feldnstein.auth'

/**
 * Backend origin. Empty in local dev (Vite proxies /g → :8080, same-origin).
 * Set at build time via VITE_API_BASE for the deployed SPA (ADR-0012).
 */
const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export function getAuth(): string | null {
  return sessionStorage.getItem(AUTH_KEY)
}

export function saveAuth(user: string, pass: string): void {
  sessionStorage.setItem(AUTH_KEY, 'Basic ' + btoa(`${user}:${pass}`))
}

export function clearAuth(): void {
  sessionStorage.removeItem(AUTH_KEY)
}

let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) }
  const auth = getAuth()
  if (auth) headers.Authorization = auth
  if (init?.body) headers['Content-Type'] = 'application/json'
  const res = await fetch(API_BASE + path, { ...init, headers })
  if (res.status === 401) {
    clearAuth()
    onUnauthorized()
    throw new Error('Session expired — sign in again.')
  }
  if (res.status === 403) {
    throw new Error('Access denied — this screen needs the ADMIN role.')
  }
  if (!res.ok) {
    let serverMsg = ''
    try {
      const body = await res.json()
      serverMsg = typeof body?.message === 'string' ? body.message : ''
    } catch {
      // non-JSON error body — fall through to the friendly default
    }
    throw new Error(
      serverMsg ||
        (res.status >= 500
          ? 'The server hit an error — try again in a moment.'
          : 'The request was rejected — check the entered values.'),
    )
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function verifyCredentials(): Promise<void> {
  await req<Product[]>('/products')
}

/** Authenticated download (CSV exports) — fetch with the Basic header, save as a file. */
export async function download(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {}
  const auth = getAuth()
  if (auth) headers.Authorization = auth
  const res = await fetch(API_BASE + path, { headers })
  if (res.status === 401) {
    clearAuth()
    onUnauthorized()
    throw new Error('Session expired — sign in again.')
  }
  if (res.status === 403) {
    throw new Error('Access denied — this screen needs the ADMIN role.')
  }
  if (!res.ok) {
    throw new Error('The export failed — try again in a moment.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const api = {
  list: <T>(path: string) => req<T[]>(path),
  get: <T>(path: string) => req<T>(path),
  create: <T>(path: string, body: unknown) =>
    req<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  update: <T>(path: string, body: unknown) =>
    req<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  post: <T>(path: string, body?: unknown) =>
    req<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => req<T>(path, { method: 'DELETE' }),
}

export function formatINR(v: number): string {
  return '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Percentages from the API are raw BigDecimals — round for display. */
export function formatPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return `${Math.round(v * 10) / 10}%`
}

/** Date-only formatting — for DATE columns where a time component would be misleading. */
export function formatDay(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

/** Username of the signed-in demo user (decoded from the Basic header). */
export function currentUsername(): string {
  const auth = getAuth()
  if (!auth) return 'unknown'
  try {
    return atob(auth.replace('Basic ', '')).split(':')[0]
  } catch {
    return 'unknown'
  }
}

/** Cross-screen navigation bus — lets any screen jump the sidebar to another page. */
export const navEvents = new EventTarget()
export function navigate(id: string): void {
  navEvents.dispatchEvent(new CustomEvent('nav', { detail: id }))
}
