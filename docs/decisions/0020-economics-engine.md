# 0020. Economics engine — variable material costs, absorption pricing, margin-governed PriceConfig

- Status: accepted

## Context

The owner's forecast workbook (`Ganuga Forecast.xlsx`) is the business's pricing brain: per-product absorption costing (capex depreciated 3y + wages + fodder + bottles + shop allocation + seed cost ÷ yearly litres) producing a cost floor, a sales price, and a margin — and it exposed white sesame running at 4% margin while black sesame makes 46%. The owner states the key dynamic explicitly: **raw-material prices are not fixed; they change**, so any pricing config must recompute from live material cost. Today the platform captures all the underlying data (procurement rates, batch yields, wages, bottling, prices) but performs none of this reasoning — it lives in Excel.

## Decision Drivers

- Margin = profit/turnover (owner's definition) → price = cost ÷ (1 − margin), floor = cost ÷ (1 − minMargin)
- Material cost is a variable: seasonal, per-lot, per-farmer — the system must default to actual procurement reality, allow manual override, and recompute downstream numbers
- PriceConfig stays the source of truth for what customers pay; economics proposes, a human approves (one click applies a new effective-dated config)
- Demo-capable offline; no external service needed

## Considered Options

1. Economics module in-platform (parameters per product + live material feed + absorption + price rules + byproduct credit) — one schema; reuses captured data; matches the workbook exactly
2. Export to spreadsheet / BI tool forever — the status quo; cost lives outside the system that holds the data, no floor guarding
3. Full ERP costing (activity-based, asset register, ledger integration) — correct but months of build for a 6-product business; premature per §3.2

## Decision

Option 1. `product_economics` (the workbook's variables per oil: trips/day, output %, kg/trip, material ₹/kg override, daily wages, yearly fodder, bottles/litre + bottle cost, shop allocation/yr, setup cost, depreciation years); material cost otherwise defaults to the procurement weighted-average rate over a configurable window (default 180 days). `price_rule` per product (targetMarginPct, minMarginPct). Absorption cost/L incl/excl setup per the workbook's formulas; byproduct (oil-cake) sales credit the cost via a windowed per-litre revenue offset. Suggested price = cost ÷ (1 − targetMargin); floor breaches flag `belowFloor` against active selling configs (per-litre normalisation across variants). Sensitivity endpoint: margin at ±10/±20% material deltas. Human-in-the-loop: applying a suggested price creates a new effective-dated PriceConfig after confirmation. Fixed-asset register and scheduled alerting deferred (reopen: second gaanuga unit or accountant user).

## Consequences

- Migration V18 (product_economics, price_rule, byproduct_sale, production_batch.cake_qty_kg)
- Door type: two-way — parameters are config; formulas are code; both revisable
- Known simplifications (recorded): setup cost is one editable number per product (not an asset register); bottle cost is a parameter (actual packaging cost integration deferred); margin evaluated per litre across variants
- Reopen triggers: >₹5cr turnover (GST e-invoicing), second production unit, accountant role requesting ledger-grade costing
