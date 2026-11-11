import { api } from './client'

/* ---- loyalty (ADR-0018): accounts + admin adjustment ---- */
export interface LoyaltyAccount {
  id: number; email: string
  balance: number; lifetimeEarned: number; lifetimeRedeemed: number
}
export interface LoyaltyAdjustRequest { points: number; reason: string }

/* ---- B2B wholesale (ADR-0018): sellers + order lifecycle ---- */
export interface B2BSeller {
  id: number; code: string; name: string
  contactName?: string; phone?: string; email?: string; gst?: string; address?: string
  active: boolean
}
export type B2BOrderStatus = 'DRAFT' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'
export interface B2BOrderLineInput { variantId: number; qty: number; unitPricePaise: number; gstPct: number }
export interface CreateB2BOrderRequest { sellerId: number; lines: B2BOrderLineInput[]; notes?: string }
export interface B2BOrderListItem {
  id: number; orderNo: string; status: string
  seller?: { id: number; code?: string; name?: string }
  sellerCode?: string; sellerName?: string
  orderDate: string; dispatchDate?: string; deliveredDate?: string
  grandTotalPaise: number; lineCount?: number; lines?: unknown[]
}
export interface B2BOrderLine {
  variantId: number; sku?: string; name?: string
  qty: number; unitPricePaise: number; gstPct: number; lineTotalPaise: number
}
export interface B2BOrderDetail {
  id: number; orderNo: string; status: string
  seller: B2BSeller
  lines: B2BOrderLine[]
  subTotalPaise: number; gstTotalPaise: number; grandTotalPaise: number
  notes?: string; warehouseId?: number
  orderDate?: string; dispatchDate?: string; deliveredDate?: string
}
export interface B2BOrderStatusRequest { status: B2BOrderStatus; warehouseId?: number }

/* ---- CRM contacts (ADR-0019): contact management + social messaging + follow-up tasks ---- */
export type CrmStatus = 'LEAD' | 'CONTACTED' | 'QUALIFIED' | 'ACTIVE' | 'INACTIVE' | 'LOST'
export const CRM_STATUSES: CrmStatus[] = ['LEAD', 'CONTACTED', 'QUALIFIED', 'ACTIVE', 'INACTIVE', 'LOST']

export interface CrmContact {
  email: string; name?: string; status: CrmStatus
  tags?: string[] | string
  whatsappPhone?: string; whatsappOptIn?: boolean
  instagramHandle?: string; source?: string
  ordersCount: number; totalSpendPaise: number; points: number
  subscribed: boolean; lastOrderAt?: string
  openTasks: number; overdueTasks: number
}

/** Upsert body for POST /g/crm/contacts. */
export interface CrmContactUpsertRequest {
  email: string
  name?: string; phone?: string
  whatsappPhone?: string; whatsappOptIn?: boolean; whatsappOptInSource?: string
  instagramHandle?: string; source?: string; tags?: string[]; status?: CrmStatus
}
/** Partial update for PATCH /g/crm/contacts/{email} — same fields, email comes from the path. */
export type CrmContactPatchRequest = Omit<CrmContactUpsertRequest, 'email'> & { email?: string }

export type CrmChannel = 'NOTE' | 'CALL' | 'EMAIL' | 'VISIT' | 'WHATSAPP' | 'INSTAGRAM'
export type CrmDirection = 'INBOUND' | 'OUTBOUND'

export interface CrmInteraction {
  id: number
  channel: CrmChannel; direction: CrmDirection
  body: string; author?: string; handle?: string
  createdAt: string
}
export interface CrmInteractionRequest {
  channel: CrmChannel
  direction?: CrmDirection
  body: string
  handle?: string
}

export interface CrmTask {
  id: number
  contactEmail?: string
  subject: string; dueAt?: string
  done: boolean; overdue: boolean
  createdBy?: string
}

export interface CrmMessageRequest {
  channel: 'WHATSAPP' | 'INSTAGRAM'
  email: string
  text: string
  templateName?: string
  templateParams?: Record<string, string>
}
export interface CrmMessageResponse {
  provider: string
  sessionOpen: boolean
  interactionId: number
  providerRef?: string
}

export interface LoyaltyTransaction {
  type: string; points: number; balanceAfter: number
  reason?: string; createdAt: string
}
export interface CrmOrderBrief {
  orderNo?: string; orderCode?: string; status?: string
  grandTotalPaise?: number; grandTotal?: number; createdAt?: string
}
export interface CrmSubscription { subscribed: boolean; source?: string; createdAt?: string }

/**
 * GET /g/crm/contacts/{email} — contact detail. The backend nests the profile
 * fields under `profile` (orders/stats/timelines stay at the top level); older
 * shapes flatten them or use a `stats` object — read all via the helpers below.
 */
export interface CrmContactProfile {
  email?: string; name?: string; phone?: string
  whatsappPhone?: string; whatsappOptIn?: boolean; whatsappOptInSource?: string
  instagramHandle?: string; source?: string
  status?: CrmStatus; tags?: string[] | string
  ordersCount?: number; totalSpendPaise?: number; points?: number
}
export interface CrmContactDetail {
  email: string; name?: string; phone?: string
  whatsappPhone?: string; whatsappOptIn?: boolean; whatsappOptInSource?: string
  instagramHandle?: string; source?: string
  status: CrmStatus; tags?: string[]
  ordersCount?: number; totalSpendPaise?: number; points?: number
  subscribed?: boolean; lastOrderAt?: string
  profile?: CrmContactProfile
  stats?: {
    ordersCount: number; totalSpendPaise: number; points: number
    subscribed: boolean; lastOrderAt?: string
  }
  interactions?: CrmInteraction[]
  tasks?: CrmTask[]
  orders?: CrmOrderBrief[]
  loyaltyTransactions?: LoyaltyTransaction[]
  subscription?: CrmSubscription
}

/** Tags arrive as either an array or a comma-separated string — normalize to an array. */
export function tagsList(tags: string[] | string | undefined | null): string[] {
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).filter(Boolean)
  return []
}

/** Flattened commerce stats for a contact detail, tolerant of `profile` / `stats` nesting. */
export function crmStats(d: CrmContactDetail): {
  ordersCount: number; totalSpendPaise: number; points: number
  subscribed: boolean; lastOrderAt?: string
} {
  return {
    ordersCount: d.ordersCount ?? d.profile?.ordersCount ?? d.stats?.ordersCount ?? 0,
    totalSpendPaise: d.totalSpendPaise ?? d.profile?.totalSpendPaise ?? d.stats?.totalSpendPaise ?? 0,
    points: d.points ?? d.profile?.points ?? d.stats?.points ?? 0,
    subscribed: d.subscribed ?? d.stats?.subscribed ?? d.subscription?.subscribed ?? false,
    lastOrderAt: d.lastOrderAt ?? d.stats?.lastOrderAt,
  }
}

/**
 * Flatten the nested `profile` payload onto the detail so screens can read
 * fields top-level; tolerant of both shapes. Coerces string tags to an array.
 */
export function flattenCrmContactDetail(d: CrmContactDetail): CrmContactDetail {
  const p = d.profile
  if (!p) return { ...d, tags: tagsList(d.tags) }
  return {
    ...d,
    email: d.email ?? p.email ?? '',
    name: d.name ?? p.name,
    phone: d.phone ?? p.phone,
    whatsappPhone: d.whatsappPhone ?? p.whatsappPhone,
    whatsappOptIn: d.whatsappOptIn ?? p.whatsappOptIn,
    whatsappOptInSource: d.whatsappOptInSource ?? p.whatsappOptInSource,
    instagramHandle: d.instagramHandle ?? p.instagramHandle,
    source: d.source ?? p.source,
    status: d.status ?? p.status ?? 'LEAD',
    tags: tagsList(d.tags ?? p.tags),
    ordersCount: d.ordersCount ?? p.ordersCount,
    totalSpendPaise: d.totalSpendPaise ?? p.totalSpendPaise,
    points: d.points ?? p.points,
  }
}

/** Growth domain endpoints (ADR-0018) — money fields are paise throughout. */
export const growth = {
  loyaltyAccounts: (q = '') =>
    api.get<LoyaltyAccount[]>(`/g/loyalty/accounts${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  adjustLoyalty: (id: number, body: LoyaltyAdjustRequest) =>
    api.post<LoyaltyAccount>(`/g/loyalty/accounts/${id}/adjust`, body),

  b2bSellers: () => api.get<B2BSeller[]>('/g/b2b/sellers'),
  createB2BSeller: (body: Omit<B2BSeller, 'id'>) => api.post<B2BSeller>('/g/b2b/sellers', body),
  b2bOrders: (status = '') =>
    api.get<B2BOrderListItem[]>(`/g/b2b/orders${status ? `?status=${status}` : ''}`),
  b2bOrder: (id: number) => api.get<B2BOrderDetail>(`/g/b2b/orders/${id}`),
  createB2BOrder: (body: CreateB2BOrderRequest) => api.post<B2BOrderDetail>('/g/b2b/orders', body),
  b2bOrderStatus: (id: number, body: B2BOrderStatusRequest) =>
    api.post<B2BOrderDetail>(`/g/b2b/orders/${id}/status`, body),

  /* ---- CRM contacts, interactions, tasks, messages (ADR-0019) ---- */
  crmContacts: (q = '', status = '') => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    const qs = params.toString()
    return api.get<CrmContact[]>(`/g/crm/contacts${qs ? `?${qs}` : ''}`)
  },
  upsertCrmContact: (body: CrmContactUpsertRequest) =>
    api.post<CrmContact>('/g/crm/contacts', body),
  patchCrmContact: (email: string, body: CrmContactPatchRequest) =>
    api.patch<CrmContact>(`/g/crm/contacts/${encodeURIComponent(email)}`, body),
  crmContactDetail: (email: string) =>
    api.get<CrmContactDetail>(`/g/crm/contacts/${encodeURIComponent(email)}`),
  addCrmInteraction: (email: string, body: CrmInteractionRequest) =>
    api.post<CrmInteraction>(`/g/crm/contacts/${encodeURIComponent(email)}/interactions`, body),
  crmTasks: () => api.get<CrmTask[]>('/g/crm/tasks?open=true'),
  createCrmTask: (body: { email: string; subject: string; dueAt?: string }) =>
    api.post<CrmTask>('/g/crm/tasks', body),
  completeCrmTask: (id: number) => api.post<CrmTask>(`/g/crm/tasks/${id}/done`),
  sendCrmMessage: (body: CrmMessageRequest) =>
    api.post<CrmMessageResponse>('/g/crm/messages', body),
}
