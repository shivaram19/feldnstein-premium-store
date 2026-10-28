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
  const res = await fetch(path, { ...init, headers })
  if (res.status === 401) {
    clearAuth()
    onUnauthorized()
    throw new Error('Session expired — sign in again.')
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function verifyCredentials(): Promise<void> {
  await req<Product[]>('/products')
}

export const api = {
  list: <T>(path: string) => req<T[]>(path),
  get: <T>(path: string) => req<T>(path),
  create: <T>(path: string, body: unknown) =>
    req<T>(path, { method: 'POST', body: JSON.stringify(body) }),
}

export function formatINR(v: number): string {
  return '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}
