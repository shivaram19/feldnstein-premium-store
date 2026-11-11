# Flows Walkthrough — Screenshot & Verification Guide

A step-by-step checklist for an AI assistant (e.g. the Kimi Chrome extension) to walk
every user-facing flow of the feldnstein platform, capture a screenshot at each marked
step, and verify the expected result. One run = a complete client-demo evidence pack.

## Environment

| App        | Deployed URL                                                        | Local dev        |
|------------|---------------------------------------------------------------------|------------------|
| Storefront | https://shivaram19.github.io/feldnstein-premium-store/              | http://localhost:4173 |
| Admin      | https://shivaram19.github.io/feldnstein-premium-store/admin/        | http://localhost:5173 |
| Backend API| https://feldnstein-platform-backend.onrender.com                    | http://localhost:8080 |

- **Cold start:** the deployed backend sleeps on the free tier. First action after idle
  can take 30–50 s; wait and retry before reporting a failure.
- **Credentials:** admin `admin/admin123` · operator `ops/ops123` · customer `cust/cust123`.
- **Navigation note:** both apps are state-driven — navigate by clicking the UI
  (sidebar items in admin, nav buttons on the storefront). There are no deep links.
- Screenshot marker: 📸 — capture the full viewport. Name screenshots
  `NN-flow-step.png` using the flow number and step below.

---

## PART A — Storefront (customer flows, login `cust/cust123`)

### A1. Home & catalog
1. Open the storefront URL. 📸 hero + product sections load.
2. Scroll the full page (top → bottom). 📸 each major section (hero, oils, process,
   subscription, footer) — no empty/dead sections.
3. Verify expected: brand content, product cards with prices (e.g. 250ml groundnut
   bottle shows ₹525 incl. GST — see price-config resolution).

### A2. Cart
1. Open a product card / shop section; click Add to Cart on any variant. 📸
2. Open the cart drawer. 📸 line item, qty stepper, subtotal.
3. Change quantity with the stepper (+ / −). 📸 subtotal recalculates.
4. Remove the item. 📸 empty-cart state.

### A3. Checkout & payment (demo gateway)
1. Add a variant to cart, open checkout. 📸 form with name/phone/address fields.
2. Verify: **Place Order stays disabled until required fields are valid.** 📸
3. Fill the form (valid phone, full address) and place order. 📸 order summary with
   resolved price + GST (5%) + loyalty points hint if redeeming.
4. Pay with the **demo payment** option. 📸 payment success screen.
5. Verify: order code shown; note it for A4.

### A4. Order tracking
1. Open Track Order; enter the order code (or registered phone/email). 📸
2. Verify: timeline shows placed → paid → confirmed status. 📸

### A5. Loyalty (customer — via order lookup, there is no standalone customer login)
1. Complete an order (A3–A4) and have it delivered (admin B12); loyalty earns 5% of
   order value on DELIVERED.
2. In Track Order, open the order with the same email + order code — the loyalty
   balance appears via the order-linked lookup (`GET /loyalty/balance?email&orderCode`).
   📸 balance + lifetime earned figures.
3. Alternatively in **admin** (B16) the same account shows balance, lifetime earned and
   the full transaction ledger.

---

## PART B — Admin (login `admin/admin123`, some screens `ops/ops123`)

### B1. Login & dashboard
1. Open `/admin/`, log in as `admin`. 📸
2. **Inventory Dashboard**. 📸 KPI cards: stock totals, low-stock, expiry radar,
   QC queue.

### B2. Stock Levels
1. Sidebar → Stock Levels. 📸 table: on-hand / reserved / on-hold / available per
   SKU·batch·warehouse.
2. Verify: qty math holds (available = on-hand − reserved − on-hold).

### B3. Production batches
1. Sidebar → Batches. 📸 list with status pills (PRESSING → … → RELEASED).
2. Create a new batch (product, press date, seed qty/cost, farmer, bull, operator,
   press). 📸 create form filled → success.
3. Advance status on a PRESSING batch (sedimentation → bottling_ready). 📸

### B4. Bull & Press
1. Sidebar → Bull & Press. 📸 bull directory with health status, work logs with
   hours worked (4-hour welfare limit), press condition.

### B5. Warehouses
1. Sidebar → Warehouses. 📸 warehouse cards (production unit + fulfilment hubs);
   open a warehouse to show its stock view.

### B6. Movements ledger
1. Sidebar → Transaction Ledger. 📸 immutable ledger: every IN/OUT with reference
   (order #, batch #, transfer #), performed-by.

### B7. Transfer / Adjustment / GRN
1. Transfer Stock: move qty between warehouses. 📸 before/after of both stock views
   + paired ledger entries.
2. Stock Adjustment: record damage/spoilage with reason. 📸
3. Goods Receipt: record received packaging against a PO, with damaged/short qty. 📸

### B8. Procurement
1. Sidebar → Procurement. 📸 seed procurement records (farmer, qty, rate, grade,
   payment status) and packaging POs.

### B9. Quality
1. Sidebar → Quality. 📸 QC queue + recorded checks (moisture %, aflatoxin ppb,
   oil temp < 40 °C cold-press proof, pass/fail).

### B10. Alerts
1. Sidebar → Alerts. 📸 active alerts (low stock / near expiry / QC overdue) and
   rules configuration.

### B11. Stock counts
1. Sidebar → Stock Counts. 📸 plan → count entry → complete → reconciliation with
   variance analysis.

### B12. Orders (admin)
1. Sidebar → Orders. 📸 order list with statuses; open an order → confirm → ship →
   deliver. 📸 status pill changes each step (loyalty earns on DELIVERED).

### B13. Prices & unit economics
1. Sidebar → Prices. 📸 price config table (MRP/SELLING/COST per variant,
   effective-dated) + Unit Economics panel: parameters, KPIs, variant margins with
   below-floor flags, sensitivity strip, oil-cake credit.

### B14. Reports
1. Sidebar → Reports. 📸 standard reports (traceability PDF per batch, inventory
   summary, production yield) + run a report schedule now.

### B15. Marketing
1. Sidebar → Marketing. 📸 subscriber list, campaign list, AI generate (demo
   provider returns content).

### B16. Loyalty (admin)
1. Sidebar → Loyalty. 📸 account balances, transaction ledger; admin adjust with
   mandatory reason (ADMIN only — verify `ops` is rejected).

### B17. B2B wholesale
1. Sidebar → B2B. 📸 seller directory + wholesale orders
   DRAFT → CONFIRMED → DISPATCHED → DELIVERED; FEFO dispatch deduction.

### B18. Customers (CRM)
1. Sidebar → Customers. 📸 contact 360°: profile, interactions across channels
   (call/email/WhatsApp/Instagram), open tasks.

### B19. Media & site content
1. Sidebar → Media. 📸 asset list with publish/unpublish actions.
2. Sidebar → Content. 📸 editable site content blocks (storefront copy/images).

### B20. Settings & audit
1. Sidebar → Settings (app settings, users) and Audit Log. 📸 user roles
   (ADMIN/OPERATOR/QC/INVENTORY/SALES) and the immutable audit trail.

---

## Verification gotchas (do not report as bugs)

- First request after idle on the deployed backend is slow (cold start).
- Demo payment provider only; Razorpay activates via env (`PAYMENT_PROVIDER=razorpay`).
- AI marketing content and messaging (WhatsApp/Instagram) use demo providers until
  env keys are set — no external calls are made.
- Stock quantity changes are only possible via Transfer/Adjustment/Hold-Release
  screens; direct edits are rejected by design (optimistic-lock guard).
- Media upload requires R2 credentials (`MEDIA_S3_*`); without them the presign
  step returns 503 by design.
