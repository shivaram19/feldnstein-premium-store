/* Shop API client — anonymous carts, checkout, demo payments, order tracking. */

const API_BASE: string = (import.meta.env.VITE_SITE_API as string | undefined) ?? ''
const TOKEN_KEY = 'feldnstein.cartToken'

/**
 * Public-folder asset path that survives a non-root Vite base
 * (GitHub Pages project site, e.g. /feldnstein-premium-store/).
 * Absolute "/assets/..." strings in JSX are never rewritten by the build.
 */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

export interface CartLine {
  variantId: number
  sku: string
  product: string
  productId?: number | null
  sizeMl: number
  qty: number
  unitPrice: number
  gstPct: number
  lineTotal: number
  available: number
}

export interface Cart {
  token?: string
  lines: CartLine[]
  subTotal: number
  gstTotal: number
  grandTotal: number
  itemCount: number
}

export interface OrderLine {
  variantId: number
  sku: string
  product: string
  sizeMl: number
  qty: number
  unitPrice: number
  gstPct: number
  lineTotal: number
}

export interface PaymentInfo {
  provider: string
  providerRef: string
  amount: number
  status: string
}

export interface CheckoutParams {
  provider: string
  keyId: string
  orderId: string
  amountPaise: number
  currency: string
  orderCode: string
  note: string
}

export interface Order {
  orderCode: string
  status: string
  customerName: string
  email: string
  phone: string
  address: string
  subTotal: number
  gstTotal: number
  grandTotal: number
  createdAt: string
  lines: OrderLine[]
  payment?: PaymentInfo | null
  timeline: Record<string, string>
  cancelReason?: string
  demoPayment?: boolean
  checkout?: CheckoutParams
  loyalty?: LoyaltySummary
}

export interface LoyaltySummary {
  earned: number
  redeemed: number
}

export interface LoyaltyBalance {
  email: string
  balance: number
  lifetimeEarned: number
}

export interface CheckoutDetails {
  customerName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
  pointsToRedeem?: number
}

export interface SubscribeResult {
  status: string
  provider: string
}

function cartToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function rememberToken(token: string | undefined): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}

function forgetToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/** Format a shelf price the way the server charges it: 2dp, half-up, ₹ prefix. */
export function inr(value: number): string {
  const rounded = Math.round((Number(value) + Number.EPSILON) * 100) / 100
  return `₹${rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  const token = cartToken()
  if (token) headers['X-Cart-Token'] = token
  const res = await fetch(API_BASE + path, { ...init, headers })
  if (!res.ok) {
    let message = `request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body?.error === 'string') message = body.error
    } catch {
      // non-JSON error body
    }
    throw new Error(message)
  }
  const data = (await res.json()) as Cart & Order & { token?: string }
  if (data.token) {
    rememberToken(data.token)
  } else if (Array.isArray(data.lines) && data.lines.length === 0) {
    forgetToken()
  }
  return data as T
}

export const shopApi = {
  getCart: () => req<Cart>('/shop/cart'),
  addItem: (variantId: number, qty: number) =>
    req<Cart>('/shop/cart/add', { method: 'POST', body: JSON.stringify({ variantId, qty }) }),
  setQty: (variantId: number, qty: number) =>
    req<Cart>(`/shop/cart/items/${variantId}`, { method: 'PUT', body: JSON.stringify({ qty }) }),
  removeItem: (variantId: number) =>
    req<Cart>(`/shop/cart/items/${variantId}`, { method: 'DELETE' }),
  checkout: (details: CheckoutDetails) =>
    req<Order>('/shop/checkout', {
      method: 'POST',
      body: JSON.stringify(details),
    }),
  verifyPayment: (orderCode: string, razorpayPaymentId: string, razorpaySignature: string) =>
    req<Order>('/shop/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ orderCode, razorpayPaymentId, razorpaySignature }),
    }),
  demoPay: (orderCode: string) =>
    req<Order>(`/shop/payments/${orderCode}/demo-pay`, { method: 'POST' }),
  track: (orderCode: string, email: string) =>
    req<Order>('/shop/orders/lookup', {
      method: 'POST',
      body: JSON.stringify({ orderCode, email }),
    }),
  loyaltyBalance: (email: string, orderCode: string) =>
    req<LoyaltyBalance>(
      `/shop/loyalty/balance?email=${encodeURIComponent(email)}&orderCode=${encodeURIComponent(orderCode)}`,
    ),
  subscribe: (email: string, name?: string) =>
    req<SubscribeResult>('/shop/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email, ...(name ? { name } : {}) }),
    }),
}

/* ===== Customer identity (ADR-0023) — separate transport: these endpoints return
   tokens that must never touch the cart-token cache. ===== */

const CUSTOMER_TOKEN_KEY = 'feldnstein.customerToken'

export function customerToken(): string | null {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY)
}

export function rememberCustomer(token: string | null): void {
  if (token) localStorage.setItem(CUSTOMER_TOKEN_KEY, token)
  else localStorage.removeItem(CUSTOMER_TOKEN_KEY)
}

export interface MeProfile {
  email: string
  name: string | null
  memberSince: string | null
  orderCount: number
  totalSpent: number
  loyalty: LoyaltyBalance & { lifetimeRedeemed?: number }
  lastAddress?: {
    customerName: string
    phone: string
    address: string
    city: string
    state: string
    pincode: string
  }
}

async function authReq<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  const token = customerToken()
  if (token) headers['X-Customer-Token'] = token
  const res = await fetch(API_BASE + path, { ...init, headers })
  if (!res.ok) {
    let message = `request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body?.error === 'string') message = body.error
    } catch {
      // non-JSON error body
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export const authApi = {
  requestMagicLink: (email: string) =>
    authReq<{ sent: boolean }>('/shop/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verify: (linkToken: string) =>
    authReq<{ token: string; email: string }>('/shop/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token: linkToken }),
    }),
  logout: () => authReq<Record<string, never>>('/shop/auth/logout', { method: 'POST' }),
  me: () => authReq<MeProfile>('/shop/me'),
  orders: () => authReq<Order[]>('/shop/me/orders'),
}
