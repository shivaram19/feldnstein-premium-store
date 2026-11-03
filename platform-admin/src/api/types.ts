import { api } from './client'

/* ---- gaanugu domain types (nested entities as returned by rest-data-panache) ---- */
export interface NamedRef { id: number; name?: string; code?: string }

export interface OilProduct {
  id: number; code: string; name: string; oilSource: string
  shelfLifeDays: number; nutritionalInfo?: string; active: boolean
  variants?: ProductVariant[]
}
export interface ProductVariant {
  id: number; sku: string; sizeMl: number; bottleType: string; capType: string
  barcode?: string; mrp?: number; product?: NamedRef
}
export interface ProductionBatch {
  id: number; batchCode: string; pressDate: string; seedType: string
  seedQtyKg: number; oilYieldLitres?: number; status: string; bestBeforeDate?: string
  product?: NamedRef; farmer?: NamedRef; bull?: NamedRef; operator?: NamedRef; press?: NamedRef
}
export interface QualityCheck {
  id: number; stage: string; moisturePct?: number; aflatoxinPpb?: number
  oilTempCelsius?: number; overallPass: boolean; notes?: string; checkedBy?: string; checkedAt: string
  batch?: NamedRef
}
export interface StockLevel {
  id: number; onHand: number; reserved: number; onHold?: number; unitCost?: number; expiryDate?: string
  variant?: ProductVariant & { product?: NamedRef }; batch?: NamedRef; warehouse?: NamedRef
}
export interface StockMovement {
  id: number; movementNo: string; movedAt: string; type: string; quantity: number
  unitCost?: number; referenceId?: string; reason?: string; performedBy?: string
  variant?: ProductVariant & { product?: NamedRef }; fromWarehouse?: NamedRef; toWarehouse?: NamedRef
}
export interface Warehouse { id: number; code: string; name: string; type: string; managerName?: string; managerPhone?: string }
export interface Supplier { id: number; code: string; type: string; name: string; phone?: string; gst?: string; active: boolean }
export interface Bull { id: number; code: string; name: string; breed?: string; healthStatus: string; dailyWorkLimitHrs: number; active: boolean }
export interface Operator { id: number; code: string; name: string; phone?: string; wageType: string; rate: number; active: boolean }
export interface Press { id: number; code: string; type?: string; beamCondition: string; status: string }
export interface PriceConfig {
  id: number; priceType: string; amount: number; gstPct: number; effectiveFrom: string; active: boolean; notes?: string
  variant?: ProductVariant & { product?: NamedRef }
}

/* ---- inventory-suite types (ADR-0008..0011) ---- */
export interface SeedProcurement {
  id: number; procurementDate: string; seedType: string; qtyKg: number; ratePerKg: number
  totalCost: number; qualityGrade?: string; paymentStatus: string; transportCost?: number
  farmer?: NamedRef
}
export interface PurchaseOrder {
  id: number; poNumber: string; orderDate: string; expectedDelivery?: string; status: string; notes?: string
  supplier?: NamedRef; deliveryWarehouse?: NamedRef
}
export interface GoodsReceipt {
  id: number; grnNumber: string; receiptDate: string; deliveryNoteNo?: string
  conditionNote?: string; receivedBy?: string; po?: NamedRef
}
export interface AlertRule { id: number; ruleType: string; scopeRef?: string; thresholdValue: number; active: boolean }
export interface Alert {
  id: number; alertType: string; severity: string; message: string
  refType?: string; refId?: string; status: string; createdAt: string; resolvedAt?: string
}
export interface AppSetting { id: number; settingKey: string; settingValue?: string; valueType: string; description?: string }
export interface AuditEvent { id: number; actor: string; action: string; entityType?: string; entityId?: string; detailJson?: string; at: string }
export interface StockCountPlan {
  id: number; planCode: string; scopeDesc?: string; warehouse?: string; warehouseId?: number
  status: string; createdBy?: string; plannedDate?: string; completedAt?: string
  lineCount: number; varianceCount: number; lines?: StockCountLine[]
}
export interface StockCountLine {
  id: number; sku: string; product?: string; batchCode?: string; warehouse: string
  systemQty: number; countedQty?: number; variance?: number; countedBy?: string; stockLevelId: number
}
export interface ReportSchedule { id: number; name: string; reportType: string; paramsJson?: string; frequency: string; nextRun?: string; active: boolean }
export interface ReportRun { id: number; reportType: string; paramsJson?: string; runAt: string; scheduleId?: number; scheduleName?: string }
export interface BullWorkLog {
  id: number; workDate: string; hoursWorked: number; healthObservation?: string
  bull?: NamedRef; batch?: NamedRef
}

export interface DashboardSummary {
  stockUnits: number; availableUnits: number; reservedUnits: number; stockValue: number
  lowStockCount: number; expiringSoonCount: number
  batchesByStatus: Record<string, number>; activeBatches: number; releasedBatches: number
  qcPendingCount: number; todaysPressings: number; totalYieldLitres: number
  qcChecksTotal: number; qcPassRate: number | null
  procurementPaid: number; procurementPending: number
}

/** Product rows as rendered by the oil-products list endpoints. */
export type OilProductRef = OilProduct

/* ---- chart-ready series from /g/analytics/charts (percentages computed server-side) ---- */
export interface ChartsData {
  batchStatus: { status: string; count: number; pct: number }[]
  qcTrend: { month: string; checks: number; passed: number; passPct: number }[]
  yieldByMonth: { month: string; litres: number }[]
  yieldByBull: { name: string; litres: number }[]
  stockByProduct: { product: string; value: number; pct: number }[]
  availability: { label: string; units: number; pct: number }[]
  expiry: { bucket: string; units: number }[]
  spendByMonth: { month: string; paid: number; pending: number }[]
}

export const gaanugu = {
  list: <T>(path: string) => api.list<T>(`/g${path}`),
  get: <T>(path: string) => api.get<T>(`/g${path}`),
  create: <T>(path: string, body: unknown) => api.create<T>(`/g${path}`, body),
  update: <T>(path: string, body: unknown) => api.update<T>(`/g${path}`, body),
  post: <T>(path: string, body?: unknown) => api.post<T>(`/g${path}`, body),
  dashboard: () => api.get<DashboardSummary>('/g/analytics/dashboard'),
  charts: () => api.get<ChartsData>('/g/analytics/charts'),
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
