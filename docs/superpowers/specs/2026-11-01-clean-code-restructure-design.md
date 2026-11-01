# Clean-code restructure — packages, folders, naming

Date: 2026-11-01. Scope: `platform-backend` (Java/Quarkus), `platform-admin` (React TSX).
Storefront `feldnstein-react` is already well-structured; light touch (dead-code check) only.

## Backend

1. Root-package strays (`Product`, `PurchaseOrder`, `StockMovement`, `LoyaltyAccount`,
   `LoyaltyTransaction`, `AnalyticsResource` + their repos/resources) move to
   `com.feldnstein.platform.commerce`. They are the storefront commerce domain, distinct
   from the richer `gaanugu` domain classes of the same simple names.
2. Flat `gaanugu` package (~90 classes) split into domain subpackages:
   - `gaanugu.production` — ProductionBatch, BottlingRun, QualityCheck (+ repos + resources)
   - `gaanugu.inventory` — Warehouse, StockLevel, StockMovement, StockCountPlan/Line/Resource, StockService
   - `gaanugu.procurement` — Supplier, SeedProcurement, PurchaseOrder/Line, GoodsReceipt/Line (+ repos + resources)
   - `gaanugu.assets` — Bull, BullWorkLog, Press, PressOperator, OperatorAttendance (+ repos + resources)
   - `gaanugu.alerts` — Alert, AlertRule (+ repos + resources + AlertOpsResource), AlertEvaluator
   - `gaanugu.reports` — ReportEngine, ReportRun, ReportSchedule, ReportScheduler, ReportsResource, GaanuguAnalyticsResource
   - `gaanugu.settings` — AppSetting, AppUser, PriceConfig (+ repos + resources), Audited, AuditEvent, AuditInterceptor, AuditResource
3. JPA entity class names are NOT renamed (Panache default table names must stay stable).
   Only `package` lines and `import` statements change. REST paths are annotation-defined
   and unaffected. Quarkus bean scanning covers subpackages automatically.
4. Import fixing is compiler-driven: move files, set package lines, iterate `mvn compile`.

## Admin (`platform-admin/src`)

1. Delete dead legacy interfaces from `api.ts` (`Product`, `StockMovement`, `PurchaseOrder`,
   `LoyaltyAccount`, `LoyaltyTransaction`, `AnalyticsSummary`) — zero consumers.
2. Folder structure:
   - `api/client.ts` — `api` fetch helper, auth (getAuth/saveAuth/clearAuth/sessionStorage),
     `verifyCredentials`, `setUnauthorizedHandler`, `navEvents`, `navigate`, `download`
   - `api/formats.ts` — formatDate/formatDay/formatINR/formatPct
   - `api/types.ts` — gaanugu domain types, `G` prefixes dropped (e.g. `GBatch` → `Batch`)
   - `api/list.tsx` — shared `useList` hook and `View` table component
   - `screens/*.tsx` — split from `gaanugu-screens.tsx` (dashboard, products, batches,
     quality, stock, movements, prices, analytics) and `gaanugu-ops.tsx` (procurement,
     warehouses, bull-press, transfer, adjustment, grn)
   - existing `alerts/counts/media/content/reports` screens move into `screens/` unchanged
   - `App.tsx`, `main.tsx`, `ui.tsx`, `styles.css` stay at root
3. Component names drop the `G` prefix: `GBatches` → `BatchesScreen`, etc. `App.tsx` nav updated.
4. `vite.config.ts` untouched; `tsc --noEmit` + build must pass.

## Verification (all must be green before commit)

- `mvn -q -f platform-backend/pom.xml compile`
- `cd platform-admin && npx tsc --noEmit && npm run build`
- `python3 scripts/e2e-business-flows.py` (91 assertions)
- `node scripts/ui-flow-tests.js` (36 checks) and Rust `uitests` suite (36 checks)

Commit pushed to both `main` and `premium-redesign`.
