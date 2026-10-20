# FELD·N·STEIN — Product Backlog

**Version:** 1.0 · **Date:** 2026-10-19 · **Owner:** Product Owner
**Status:** Draft for team review

---

## 0. Context & How to Read This Backlog

**Current state:** Static storefront — `feldnstein_premium_store/` (plain HTML + Tailwind CDN + `js/main.js`). No backend, no database, no build step.
**Target:** Full-stack platform — React SPA + API + Postgres, with admin tooling the client can operate themselves.

Homepage sections to preserve: hero (kinetic type + video), "Seed to Apothecary Bottle" process, transparency/ingredient matrix, The Absolute Reserve collection (5 cold-pressed oils), subscription, testimonials, CTA/footer.
Brand promise: **farm-direct, lab-tested batches** → batches are a first-class domain concept, not an afterthought.

**Conventions:**
- Story format: *As a [role], I want [capability], so that [benefit].*
- Story points: Fibonacci (1, 2, 3, 5, 8, 13, 21)
- Priority: **P0** = MVP must-have · **P1** = should-have, next · **P2** = nice-to-have
- Checkboxes = task / subtask for the dev team
- Every story lists its **Dependencies** — the order below respects them

---

## EPIC 1 — React Migration of the Homepage

### Story FE-1.1: Migrate homepage to React with full parity
**As a** shopper, **I want** the same fast, animated homepage after migration, **so that** the brand experience is not degraded by the tech change.

**Story points:** 13 · **Priority:** P1 · **Dependencies:** none (can start immediately, runs parallel to backend epics)

**Acceptance Criteria:**
- [ ] Visual + behavioral parity with `index.html` at all breakpoints (mobile <768px, tablet, desktop 1240px)
- [ ] All sections present: hero, process, transparency matrix, collection carousel, subscription, testimonials, CTA/footer
- [ ] All interactions preserved: sticky glass header, scrollspy nav, reveal-on-scroll, mobile menu, carousel + dots, quick-view modal, quick-add to cart
- [ ] Performance ≥ current baseline: LCP ≤ 2.5s on simulated 4G mobile (Lighthouse)
- [ ] SEO parity: title/meta/OG tags, semantic HTML, crawlable content

**Tasks & Subtasks:**

1. **Project scaffolding**
   - [ ] Scaffold Vite + React + TypeScript app in repo
   - [ ] Port Tailwind config + all design tokens from `DESIGN.md` (colors, Newsreader/Plus Jakarta Sans type scale, radius, spacing) into the theme
   - [ ] Folder structure (`components/`, `sections/`, `hooks/`, `lib/`), ESLint + Prettier, CI build check
   - [ ] Asset pipeline: move `assets/img` + `assets/video` into bundled/public assets, keep lazy-loading
2. **Componentize sections**
   - [ ] `<Header/>` — glassmorphism sticky nav + mobile menu + scrollspy
   - [ ] `<Hero/>` — kinetic headline animation + lazy-loaded video
   - [ ] `<Process/>` — seed-to-bottle timeline
   - [ ] `<TransparencyMatrix/>` — "Mass Market vs Our Standard" comparison pills
   - [ ] `<Collection/>` + `<QuickViewModal/>` — product carousel, quick-view, quick-add
   - [ ] `<Subscription/>`, `<Testimonials/>`, `<CTA/>`, `<Footer/>`
   - [ ] Shared UI primitives per `DESIGN.md`: pill buttons (primary/gold/ghost), purity & banned badges, section labels
3. **State & interactions**
   - [ ] Port `main.js` behaviors to hooks: `useScrollSpy`, `useReveal` (IntersectionObserver), `useCarousel`
   - [ ] Cart state via React Context; persist to `localStorage`
   - [ ] Port or replace the custom SVG leg animation in `main.js` — needs PO sign-off if dropped
4. **QA & release**
   - [ ] Visual regression screenshots vs static site at 3 breakpoints
   - [ ] Lighthouse audit + WCAG AA contrast check against the brand palette
   - [ ] Deploy to staging; cutover plan (redirect/rewrite old page)

---

## EPIC 2 — User & Admin Login

### Story AUTH-1.1: Customer accounts with registration & login
**As a** customer, **I want** to register and log in, **so that** my cart, orders, addresses, and subscriptions are tied to me.

**Story points:** 8 · **Priority:** P0 · **Dependencies:** DB-1.1 (users table)

**Acceptance Criteria:**
- [ ] Signup with email + password; verification email required before first login
- [ ] Login/logout; session persists across refresh via secure httpOnly cookie (or short-lived JWT + refresh token)
- [ ] Password reset via emailed link (expiring token)
- [ ] Inline validation errors; rate limiting + lockout on repeated failed logins
- [ ] Profile page: name, phone, multiple saved addresses

**Tasks & Subtasks:**

1. **Backend auth service**
   - [ ] Confirm auth approach (see Open Questions) and scaffold service
   - [ ] `POST /auth/register`, `/login`, `/logout`, `/refresh`, `/forgot-password`, `/reset-password`
   - [ ] Password hashing (argon2/bcrypt); email verification token flow
   - [ ] Rate limiting + brute-force lockout; audit log of auth events
2. **Customer UI**
   - [ ] `/login`, `/register`, `/forgot-password`, `/reset-password` screens (design-system styled)
   - [ ] Auth context (current user), protected-route wrapper, redirect-after-login
   - [ ] Profile page: edit details, manage addresses
3. **Admin login & roles**
   - [ ] RBAC: `role` on user (`customer` | `admin`); **no public admin self-signup**
   - [ ] Admin accounts provisioned by existing super-admin (seed)
   - [ ] Admin login page + route guard on `/admin/*`

---

## EPIC 3 — Database Schema

### Story DB-1.1: Design & create the core schema
**As a** platform, **I need** a normalized, versioned schema, **so that** products, batches, inventory, orders, and users stay consistent as every other epic builds on it.

**Story points:** 8 · **Priority:** P0 · **Dependencies:** none — **foundational, must land first**

**Acceptance Criteria:**
- [ ] Migrations are versioned and run identically on local/staging/prod
- [ ] ER diagram + naming conventions documented in `/docs`
- [ ] Seed data: 5 reserve oils with demo batches, one admin user, one test customer
- [ ] Downstream epics (INV, API, DASH, PAY) consume it without a remodel

**Tasks & Subtasks (entities):**

1. **Identity & auth**
   - [ ] `users` (id, email, password_hash, name, phone, role, verified_at, timestamps)
   - [ ] `addresses` (user_id, line1/2, city, state, pincode, is_default)
   - [ ] `sessions` / `refresh_tokens` (user_id, token_hash, expires_at)
2. **Catalog**
   - [ ] `products` (id, slug, name, description, story, price, mrp, unit_size, category, badge, is_published, timestamps)
   - [ ] `product_images` (product_id, url, alt, sort_order)
   - [ ] `categories`
3. **Batches** — first-class per brand promise
   - [ ] `batches` (id, batch_no, product_id, harvest_date, milled_date, expires_at, qty_initial, qty_available, lab_report_url, lab_tested_at, status)
   - [ ] `lab_results` (batch_id, nutrient/purity key-value rows shown on the transparency matrix)
4. **Inventory ledger**
   - [ ] `inventory_movements` (batch_id, type: in/out/adjust/reserve/release, qty, reason, ref_type/ref_id, actor, timestamp)
5. **Orders & payments** — design now, implement in PAY epic
   - [ ] `orders` (id, user_id, status, subtotal, tax, total, shipping_address JSON, payment_status)
   - [ ] `order_items` (order_id, batch_id, product snapshot: name/price/qty)
   - [ ] `payments` (order_id, gateway, gateway_ref, amount, status, raw webhook payload)
6. **Admin content & audit** (required by API-1.1)
   - [ ] `product_content_versions` (product_id, payload JSON, version, published_at, author)
   - [ ] `audit_log` (actor_id, action, entity, entity_id, diff JSON, timestamp)
7. **Tooling**
   - [ ] Migration runner + seed scripts wired into dev setup
   - [ ] ER diagram in `docs/`

---

## EPIC 4 — Inventory Management

### Story INV-1.1: Track stock per batch with FEFO & traceability
**As an** ops admin, **I want** stock tracked at batch level, **so that** expiry-first selling and the "lab-tested batch" promise stay accurate.

**Story points:** 13 · **Priority:** P0 · **Dependencies:** DB-1.1, AUTH-1.1 (admin)

**Acceptance Criteria:**
- [ ] Stock decremented from a *specific batch* at order time; oversell impossible (transaction/constraint)
- [ ] FEFO allocation: earliest expiry ships first
- [ ] Admin can create a batch (attach lab report), adjust stock, mark a batch depleted
- [ ] Product page shows batch info: batch no., lab-tested badge, milled/expiry dates
- [ ] Low-stock and near-expiry alerts surface (dashboard flag + email)
- [ ] Every movement written to the `inventory_movements` ledger

**Tasks & Subtasks:**

1. **Backend**
   - [ ] Batches CRUD endpoints (admin-scoped)
   - [ ] Availability endpoint: `GET /products/:id/availability`
   - [ ] Stock reservation service (reserve at checkout, release on payment failure, commit on success)
   - [ ] FEFO allocation logic + integration with order flow
2. **Admin UI**
   - [ ] Inventory screen: per-product batch table (qty, expiry, lab status, flags)
   - [ ] Add batch / adjust stock flows, each writing audit + ledger entries
3. **Customer UI**
   - [ ] Batch badge + dates on product cards, quick-view modal, and future PDP
   - [ ] Public batch traceability lookup (enter batch no → lab result) — *confirm MVP scope, see Open Questions*
4. **Alerts**
   - [ ] Low-stock & near-expiry rules + notification wiring

---

## EPIC 5 — Self-Service Product Content Endpoints

### Story API-1.1: Let the client edit product content themselves
**As the** store owner (non-technical), **I want** to edit product descriptions, prices, badges, and imagery through an admin UI, **so that** routine content changes never need a developer or a deploy.

**Story points:** 8 · **Priority:** P1 · **Dependencies:** DB-1.1, AUTH-1.1 (admin), FE-1.1 (for the public rendering side)

**Acceptance Criteria:**
- [ ] Admin can edit: description/story, name, price & MRP, badge, category, images; changes go live without a deploy
- [ ] Draft → preview → publish flow (drafts never visible publicly)
- [ ] Full audit trail: who changed what, when; rollback to any previous version
- [ ] Public catalog API serves only published content; cache invalidates on publish
- [ ] Rich-text input sanitized (XSS-safe); only `admin` role can write
- [ ] OpenAPI docs generated for all endpoints

**Tasks & Subtasks:**

1. **API**
   - [ ] `GET /api/catalog` (public, published products + batch badge) and `GET /api/products/:slug`
   - [ ] Admin write endpoints: `PUT /api/admin/products/:id/content`, image upload endpoint
   - [ ] Versioning: save draft, preview, publish actions backed by `product_content_versions`
   - [ ] Cache layer (CDN/app cache) with invalidation on publish
2. **Admin UI**
   - [ ] Product list screen (search, publish status)
   - [ ] Product editor: form fields + rich-text + image upload + live preview
   - [ ] Version history panel with "restore"
3. **Hardening**
   - [ ] Authorization middleware (`admin` only), input validation, sanitization
   - [ ] Rate limiting + size limits on uploads; OpenAPI spec published

---

## EPIC 6 — Analytics & Batch Dashboard

### Story DASH-1.1: One dashboard for sales analytics & batch status
**As the** owner, **I want** revenue, order, and batch/inventory visibility in one admin dashboard, **so that** I can run the business without writing SQL or asking devs.

**Story points:** 13 · **Priority:** P1 · **Dependencies:** AUTH-1.1 (admin), INV-1.1, DB-1.1

**Acceptance Criteria:**
- [ ] KPI cards: revenue, orders, average order value, conversion rate — each vs previous period
- [ ] Charts: sales by day, sales by product, top products
- [ ] Batch panel: live batches per product, stock levels, expiry radar, lab-test status
- [ ] Numbers verified against raw SQL on seed data (no drift)
- [ ] Admin-gated; page load < 2s

**Tasks & Subtasks:**

1. **Backend**
   - [ ] Aggregation endpoints (`/api/admin/analytics/*`, `/api/admin/batches/summary`) or SQL views/materialized snapshots
   - [ ] Scheduled snapshot job if on-the-fly aggregation is too slow
2. **Admin frontend**
   - [ ] `/admin` shell: sidebar layout + auth guard (shared foundation for inventory & product editors too)
   - [ ] KPI cards + charts (e.g., Recharts) + date-range picker
   - [ ] Batch table with filters (product, status, expiry window) + CSV export
3. **QA**
   - [ ] Reconcile dashboard figures vs raw queries on seed data

---

## EPIC 7 — Payments

### Story PAY-1.1: Secure checkout & payment
**As a** customer, **I want** to pay at checkout with my preferred method, **so that** I can complete my order safely and quickly.

**Story points:** 13 · **Priority:** P0 · **Dependencies:** INV-1.1 (stock reservation), AUTH-1.1 (customer), DB-1.1 (orders/payments)

**Acceptance Criteria:**
- [ ] Gateway integrated supporting cards, UPI, netbanking, wallets *(provider = PO decision, see Open Questions)*
- [ ] Order created **only** after webhook-confirmed payment; webhook signature verified
- [ ] Idempotent checkout: retries/double-clicks never create duplicate orders or charges
- [ ] Stock reserved at checkout, released on failure/timeout
- [ ] Clear success / failed / pending UX with retry path
- [ ] Admin: payment status per order; refund support (manual via gateway console acceptable for MVP)
- [ ] Invoice shows GST breakdown — *confirm with accountant, see Open Questions*

**Tasks & Subtasks:**

1. **Backend**
   - [ ] `POST /api/checkout` — validate cart, reserve stock (FEFO), create pending order
   - [ ] Gateway order/session creation; signature-verified webhook handler updating order + payment state machine
   - [ ] Idempotency keys on checkout; automatic reservation release on timeout/failure
   - [ ] Refund endpoint (admin) calling gateway API
2. **Frontend**
   - [ ] Checkout page: address select, order summary, payment widget/redirect
   - [ ] Success / failure / pending result pages with retry
3. **Ops & compliance**
   - [ ] Gateway account + KYC; webhook secrets in env vars; test-mode end-to-end suite (mock success/failure/webhook replay)
   - [ ] Daily reconciliation report: our orders vs gateway settlements
   - [ ] PCI scope minimized — card data never touches our servers (gateway-hosted fields only)

---

## Proposed Sequencing (MVP track)

| Sprint | Focus |
|--------|-------|
| 1 | DB-1.1 (foundation) + FE-1.1 kickoff |
| 2 | FE-1.1 finish + AUTH-1.1 |
| 3 | INV-1.1 + PAY-1.1 start |
| 4 | PAY-1.1 finish (MVP can sell) |
| 5 | API-1.1 (client self-service) |
| 6 | DASH-1.1 |

**Critical path:** DB → Auth → Inventory → Payments.

---

## Open Questions (PO decisions needed before Sprint 1)

1. **Payment provider:** Razorpay (India-first, UPI) vs Stripe vs Cashfree?
2. **Auth:** Build in-house vs managed (Supabase Auth / Auth0 / Clerk)?
3. **"The database that we have":** there is no DB in the repo today — is there an existing database elsewhere to migrate, or is this greenfield? *(Assumed greenfield here.)*
4. **Hosting:** Vercel + managed Postgres, or a single VPS (Node + Postgres + Nginx)?
5. **Public batch traceability lookup** (customer enters batch no → lab result): MVP or later?
6. **Draft/preview for product edits:** required at launch, or is direct-publish fine for MVP?
7. **Locale:** INR only? English + Telugu content?
8. **Subscription section on the homepage:** recurring billing in MVP? (Constrains payment provider choice.)
9. **SVG leg animation** in `main.js`: port to React or drop?
