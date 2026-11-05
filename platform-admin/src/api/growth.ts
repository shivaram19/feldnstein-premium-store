import { api } from './client'

/* ---- loyalty (ADR-0018): accounts + admin adjustment ---- */
export interface LoyaltyAccount {
  id: number; email: string
  pointsBalance: number; lifetimeEarned: number; lifetimeRedeemed: number
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
  id: number; orderNo: string; sellerCode: string; sellerName: string; status: string
  orderDate: string; dispatchDate?: string; deliveredDate?: string
  grandTotalPaise: number; lineCount: number
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

/* ---- CRM (ADR-0018): customer-360 read model aggregated by email ---- */
export interface CrmCustomer {
  email: string; name?: string
  ordersCount: number; totalSpendPaise: number; points: number
  subscribed: boolean; lastOrderAt?: string
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
export interface CrmCustomerDetail {
  profile: { email: string; name?: string; phone?: string; joinedAt?: string }
  orders: CrmOrderBrief[]
  loyaltyTransactions: LoyaltyTransaction[]
  subscription: CrmSubscription
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

  crmCustomers: (q = '') =>
    api.get<CrmCustomer[]>(`/g/crm/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  crmCustomer: (email: string) =>
    api.get<CrmCustomerDetail>(`/g/crm/customers/${encodeURIComponent(email)}`),
}
