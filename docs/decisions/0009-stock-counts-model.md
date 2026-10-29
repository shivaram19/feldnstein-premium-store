# 0009. Stock counts: plan + lines with reconciliation workflow

- Status: accepted

## Context

The nav tree includes STOCK COUNTS > Count Plans / Execute Count / Reconciliation. Physical stock
diverges from system stock (breakage, leakage, miscounts); without a count workflow the ledger
drifts and financials lose trust. Not decided here: cycle-count scheduling strategy.

## Decision Drivers

- Counts are a two-phase human process: freeze a plan, then count — the model must separate them.
- Reconciliation must write the same adjustment StockMovement as manual adjustments (one ledger).
- FSSAI/financial audit needs who counted, when, and the variance they signed off.

## Considered Options

1. **Direct adjustment only** (no plan) — zero process support; recounts and sign-off impossible; rejected.
2. **Plan + lines with lifecycle** (PLANNED → IN_PROGRESS → COMPLETED → RECONCILED), variance
   computed at completion, reconcile posts adjustment movements — matches the physical process; chosen.
3. Blind-count double-entry verification — YAGNI for the demo scale; revisit at multi-warehouse scale.

## Decision

Option 2. `stock_count_plan(scope: product/warehouse filter, status, created_by)` with
`stock_count_line(stock_level_id, system_qty, counted_qty, variance)`; completion locks lines and
computes variance; reconciliation posts one `StockMovement` ADJUSTMENT per non-zero variance.
AI-drafted; accepted by the project owner.

## Consequences

Easier: variance analysis and audit trail for shrinkage. Harder: lifecycle transitions must be
validated server-side (implemented in the count resource). Deferred: blind counts, cycle-count
auto-scheduling, approval workflow for large variances.
