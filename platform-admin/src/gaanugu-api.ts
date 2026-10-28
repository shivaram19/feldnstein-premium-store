import { api } from './api'

/* ---- gaanugu domain types (nested entities as returned by rest-data-panache) ---- */
export interface NamedRef { id: number; name?: string; code?: string }

export interface GOilProduct {
  id: number; code: string; name: string; oilSource: string
  shelfLifeDays: number; nutritionalInfo?: string; active: boolean
  variants?: GVariant[]
}
export interface GVariant {
  id: number; sku: string; sizeMl: number; bottleType: string; capType: string
  barcode?: string; mrp?: number; product?: NamedRef
}
export interface GBatch {
  id: number; batchCode: string; pressDate: string; seedType: string
  seedQtyKg: number; oilYieldLitres?: number; status: string; bestBeforeDate?: string
  product?: NamedRef; farmer?: NamedRef; bull?: NamedRef; operator?: NamedRef; press?: NamedRef
}
export interface GQualityCheck {
  id: number; stage: string; moisturePct?: number; aflatoxinPpb?: number
  oilTempCelsius?: number; overallPass: boolean; notes?: string; checkedBy?: string; checkedAt: string
  batch?: NamedRef
}
export interface GStockLevel {
  id: number; onHand: number; reserved: number; unitCost?: number; expiryDate?: string
  variant?: GVariant & { product?: NamedRef }; batch?: NamedRef; warehouse?: NamedRef
}
export interface GMovement {
  id: number; movementNo: string; movedAt: string; type: string; quantity: number
  unitCost?: number; referenceId?: string; reason?: string; performedBy?: string
  variant?: GVariant & { product?: NamedRef }; fromWarehouse?: NamedRef; toWarehouse?: NamedRef
}
export interface GWarehouse { id: number; code: string; name: string; type: string; managerName?: string; managerPhone?: string }
export interface GSupplier { id: number; code: string; type: string; name: string; phone?: string; gst?: string; active: boolean }
export interface GBull { id: number; code: string; name: string; breed?: string; healthStatus: string; dailyWorkLimitHrs: number; active: boolean }
export interface GOperator { id: number; code: string; name: string; phone?: string; wageType: string; rate: number; active: boolean }
export interface GPress { id: number; code: string; type?: string; beamCondition: string; status: string }
export interface GPriceConfig {
  id: number; priceType: string; amount: number; gstPct: number; effectiveFrom: string; active: boolean; notes?: string
  variant?: GVariant & { product?: NamedRef }
}

export interface GDashboard {
  stockUnits: number; availableUnits: number; reservedUnits: number; stockValue: number
  lowStockCount: number; expiringSoonCount: number
  batchesByStatus: Record<string, number>; activeBatches: number; releasedBatches: number
  qcPendingCount: number; todaysPressings: number; totalYieldLitres: number
  qcChecksTotal: number; qcPassRate: number | null
  procurementPaid: number; procurementPending: number
}

export const gaanugu = {
  list: <T>(path: string) => api.list<T>(`/g${path}`),
  create: <T>(path: string, body: unknown) => api.create<T>(`/g${path}`, body),
  dashboard: () => api.get<GDashboard>('/g/analytics/dashboard'),
  traceability: () => api.get<Record<string, unknown>[]>('/g/analytics/traceability'),
}

export const BATCH_STATUSES = ['PRESSING', 'SEDIMENTATION', 'BOTTLING_READY', 'BOTTLING', 'QC_PENDING', 'QC_PASSED', 'RELEASED'] as const

export function batchStatusTone(s: string): 'green' | 'rust' | 'gold' | 'forest' | 'slate' {
  switch (s) {
    case 'RELEASED': return 'green'
    case 'QC_PASSED': return 'forest'
    case 'QC_PENDING': return 'gold'
    case 'PRESSING': return 'slate'
    default: return 'forest'
  }
}
