# 2026-10-28 Inventory suite: full admin nav tree

Design for building the complete client-approved navigation tree (10 sections) on the feldnstein
platform (Quarkus backend, React-TSX admin, H2 dev / Postgres prod).

## Scope

Decomposed into four workstreams, delivered on one branch `feature/inventory-suite`,
one Flyway `V5` migration, one PR.

### A. Procurement + Warehouses + Bull/Press (frontend-only)

Backend entities already exist. New screens:

- `/admin/procurement`: Seed Procurement (list + create), Purchase Orders (list + create),
  Supplier Directory.
- `/admin/warehouses`: Warehouse list; per-warehouse stock view (filter stock_levels by warehouse).
- Bull & Press management: bull directory + work logs, press directory. Lives under
  BATCH & PRODUCTION per the nav tree.

### B. Alerts + Settings + Audit Log (new backend)

- `alert_rule` (LOW_STOCK, NEAR_EXPIRY, QC_OVERDUE thresholds) + `alert` rows materialized by a
  Quarkus `@Scheduled` evaluator (also runnable on demand). Dismiss/resolve persisted on the alert.
- `app_setting` typed key-value store powering Settings > General, Reorder Rules, Expiry Policy,
  Bull & Press Config. Permissions = read-only role matrix (file realm is not editable at runtime).
- `audit_event` written by a CDI interceptor (`@Audited("MOVEMENT")`) on mutation endpoints we care
  about: transfers, adjustments, batch status, QC checks, GRN, count reconciliation.
  Auto-generated master-data CRUD is not audited. ADMIN-only read.

### C. Stock Counts (new backend)

`stock_count_plan` + `stock_count_line`. Lifecycle PLANNED → IN_PROGRESS → COMPLETED → RECONCILED.
Count execution records system vs counted qty per line; variance analysis view; reconcile posts an
adjustment StockMovement per variance line.

### D. Reports suite

- Standard reports (SQL-backed endpoints + CSV): inventory summary, production yield, expiry/FEFO,
  procurement spend.
- Custom builder: scoped to the stock-movement ledger with whitelisted dimensions
  (product, warehouse, movement type, date range) and aggregations (qty, value, group-by).
  No arbitrary SQL — safe by construction.
- Scheduled reports: `report_schedule` (frequency DAILY/WEEKLY/MONTHLY, next_run) checked by
  `@Scheduled`; a due schedule produces a `report_run` row holding the CSV. No email in demo;
  runs are listed and downloadable in the UI.

## Cross-cutting

- Sidebar restructured to the client tree (10 top-level sections).
- New transactional endpoints: `POST /g/stock/transfers` and `POST /g/stock/adjustments` write
  StockMovement rows **and** update stock_levels atomically (today movements are ledger-only).
- Hold & Release: stock-level hold flag (reserved/on_hand unchanged; available recomputed),
  surfaced in QUALITY CONTROL.

## Explicitly deferred

- Batch status-gate enforcement server-side (recorded deferral from Phase 1).
- Email delivery of scheduled reports.
- Runtime role editing (file realm).
- Phase-1 batch genealogy drill-down (pages 12/25).
- Removal of ADR-0004 demo entities (after Phase-1 UI replaces them).

## Verification

`tsc --noEmit`, `npm run build`, `mvn compile`, live curl of new endpoints incl. RBAC (403 for
OPERATOR on ADMIN-only audit), adr-check OK.
