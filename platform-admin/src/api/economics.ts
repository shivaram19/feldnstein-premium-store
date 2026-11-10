import { api } from './client'

/* ---- unit economics (ADR-0020): absorption costing, price rules, sensitivity, byproduct credit ---- */

/** The workbook's editable variables per oil (PUT body for /g/economics/products/{id}). */
export interface EconomicsParams {
  tripsPerDay: number
  outputPct: number
  rawMaterialKgPerTrip: number
  materialCostPerKgOverride: number | null
  dailyWages: number
  wageDaysPerYear: number
  yearlyFodder: number
  bottlesPerLitre: number
  bottleCostPaise: number
  shopAllocationPerYear: number
  setupCost: number
  depreciationYears: number
}

export type MaterialSource = 'OVERRIDE' | 'PROCUREMENT' | 'NONE'

export interface PriceRule { targetMarginPct: number; minMarginPct: number }

export interface EconomicsVariant {
  variantId: number; sku: string; sizeMl: number
  activePricePaise: number; pricePerLitrePaise: number
  marginAtCurrentPct: number; belowFloor: boolean
}

/** Full computed snapshot — money in paise, percentages as fractions (render ×100). */
export interface ProductEconomics {
  productId: number
  params: EconomicsParams
  materialCostPerKg: number | null
  materialSource: MaterialSource
  rawMaterialPerDay: number
  yearlyProductionLitres: number
  materialCostPerYear: number
  yearlyOverheads: number
  absorptionInclSetupPaise: number
  absorptionExclSetupPaise: number
  cakeCreditPerLitrePaise: number
  netCostPaise: number
  priceRule: PriceRule | null
  suggestedPricePaise: number
  floorPricePaise: number
  variants: EconomicsVariant[]
  computedAt: string
}

export interface SensitivityRow {
  materialDeltaPct: number
  absorptionInclSetupPaise: number
  netCostPaise: number
  marginAtCurrentPricePct: number
  marginAtSuggestedPct: number
}

export interface ByproductSale {
  id: number; productId: number
  qtyKg: number; pricePerKgPaise: number
  buyer?: string; soldAt: string; batchId?: number
}

export interface ByproductSaleRequest {
  productId: number; qtyKg: number; pricePerKgPaise: number
  buyer?: string; soldAt?: string; batchId?: number
}

/** Economics endpoints (ADR-0020) — money fields are paise; percentages are fractions. */
export const economics = {
  snapshots: () => api.get<ProductEconomics[]>('/g/economics/products'),
  snapshot: (productId: number) => api.get<ProductEconomics>(`/g/economics/products/${productId}`),
  saveParams: (productId: number, params: EconomicsParams) =>
    api.update<ProductEconomics>(`/g/economics/products/${productId}`, params),
  savePriceRule: (productId: number, rule: PriceRule) =>
    api.post<PriceRule>('/g/economics/price-rules', { productId, ...rule }),
  sensitivity: (productId: number) =>
    api.get<SensitivityRow[]>(`/g/economics/products/${productId}/sensitivity`),
  byproductSales: (productId: number) =>
    api.get<ByproductSale[]>(`/g/economics/byproduct-sales?productId=${productId}`),
  recordByproductSale: (body: ByproductSaleRequest) =>
    api.post<ByproductSale>('/g/economics/byproduct-sales', body),
}
