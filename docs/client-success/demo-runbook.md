# Client Demo Runbook — Customer Success Manager Instructions

**Meeting:** 90 minutes, client stakeholders: Business owner/GM, Production supervisor, Quality/FSSAI compliance, Procurement/inventory ops.
**Primary environment:** local (`http://localhost:5173`, backend `:8080`). **Backup:** live — admin at `https://shivaram19.github.io/feldnstein-premium-store/admin/` (storefront at the root `/`, backend `https://feldnstein-platform-backend.onrender.com`).
**Logins:** `admin/admin123` (ADMIN), `ops/ops123` (OPERATOR), `cust/cust123` (CUSTOMER). Same on local and live.

---

## Day-before rehearsal (30 min)

1. Start backend dev server and Vite; confirm both up.
2. Run `python3 scripts/e2e-business-flows.py` — must be 77/77 green. If red, fix or re-seed before the meeting.
3. Walk the full run-of-show once, in order, clicking every demo action below.
4. Wake the live backend once (`curl https://feldnstein-platform-backend.onrender.com/q/health`) so you know its cold-start time; free Render sleeps after ~15 min idle and the first hit takes 30–50 s while Flyway replays.
5. Prepare a re-seed path (restart backend dev or rerun E2E script) in case demo data is dirtied mid-meeting.

## T-30 → T-0 pre-flight

- [ ] Backend and Vite running; login as `admin` works.
- [ ] E2E smoke green.
- [ ] Incognito window open, logged in as `ops` (for the RBAC contrast).
- [ ] Second tab logged in as `cust` (storefront segment).
- [ ] Screen share shows browser only; notifications muted.
- [ ] Live URLs open in background tabs, backend already warm.

---

## Run-of-show

### 0–5 min — Opening + RBAC proof (you, admin login)

1. Open `http://localhost:5173`, log in as `admin/admin123`.
2. One sentence: *"One platform runs the whole gaanugu — farmer to customer — and each person only sees what their job needs."*
3. Switch to the incognito `ops` window: show the nav is smaller. Switch back to admin.
4. Say the customer role exists too — you'll show it at the end.

**Handoff:** *"Before I show you screens, let me show you the one thing nobody else can: where a bottle actually comes from."*

### 5–12 min — Traceability story (owner) — Reports → Standard Reports → Traceability

This is the differentiator; open with it while attention is highest.

1. Pick a seeded batch (e.g., a Groundnut batch). Walk the report top to bottom: **seed farmer → procurement record → bull → operator → press unit → pressing date → QC results → bottling → stock → customer orders.**
2. Talking points:
   - Every bottle traces to a named farmer, a named bull, and a pressing session — this is the proof of authentic bull-driven cold-pressing.
   - QC results including pressing temperature (< 40 °C) are part of the record — FSSAI audit-ready, PDF exportable.
   - This report answers a customer complaint in one lookup instead of a day of phone calls.
3. If they ask: show the **Audit Log** — *every* change in the system is recorded with who/when.

**Handoff:** *"Now let me show you how that record gets created — starting at the press."*

### 12–30 min — Production supervisor segment (admin login)

**Nav: Batch & Production → All Batches**

1. Show the list with status filters: pressing → sedimentation → bottling_ready → bottling → qc_pending → qc_passed → released.
2. **Create Batch:** fill the pressing session — product, seed quantity & cost, farmer, bull, operator, press unit, yield, spillage, all costs. Talking point: *cost capture happens at the source, so every batch already knows its true cost before it's sold.*
3. **Advance status** on an open batch — show the confirm dialog. Talking point: *the lifecycle is a gate — bottling team only sees bottling_ready, QC only sees qc_pending. Nobody can skip a step.*
4. **Bottling** on a ready batch: bottles filled/capped/labeled, damaged count, bin location. Talking point: *this is the moment raw oil becomes sellable stock.*
5. **Bull & Press Management:** bull directory (health status, 4-hr/day working limit, vet checks) + work logs; press directory with maintenance schedule. Talking point: *animal-welfare compliance and downtime planning are built in, and both feed real cost.*
6. **Operators tab:** attendance + wage rates → payroll and per-batch labor cost.

**Let them click:** invite the supervisor to advance one batch status themselves and to log a bull work session.

**Handoff:** *"A batch can't be sold until quality signs off — that's the next gate."*

### 30–45 min — Quality / FSSAI segment (admin login)

**Nav: Quality Control → QC Dashboard**

1. Show the pending queue — batches waiting for inspection.
2. **Lab Test Records / create check:** walk one record — moisture %, foreign matter, aflatoxin ppb, pesticide residue, pressing temperature, seal integrity, photos. Talking point: *temperature under 40 °C is recorded per batch — documented proof of the cold-pressed claim.*
3. **Hold & Release:** show a failed batch being held and what release does. Talking point: *held stock is blocked from sales automatically — a failed batch can never reach a customer.*
4. **Alerts → Active Alerts:** expiry warnings, low stock. Talking point: *near-expiry stock gets flagged before it becomes a write-off.*

**Likely question — "What if a batch fails after partial sale?"** Answer: traceability report shows exactly which customers received it; recall is a filtered list, not a guess.

**Handoff:** *"Once QC releases, it's stock — and stock is where money sits, so let's look at inventory."*

### 45–65 min — Procurement / inventory ops segment (admin login)

1. **Stock Levels (Stock Overview):** on-hand / reserved / available per SKU-batch-warehouse; drill into a **Stock Detail View** — batch genealogy, movement history, order allocations. Talking point: *customer service checks availability here before promising delivery.*
2. **Movements → Transaction Ledger:** immutable audit trail of every IN/OUT. Talking point: *when physical stock and system stock disagree, this is where you find out why.*
3. **Transfer Stock:** production warehouse → fulfilment hub with carrier/tracking. **Stock Adjustment:** broken bottles with reason + photo.
4. **Goods Receipt (GRN):** receive a PO — 3-way match (PO vs delivered vs accepted). Talking point: *you only pay for what arrived in good condition.*
5. **Purchase Orders** for bottles/caps/labels + **Seed Procurement** from the farmer directory (quantity, rate/kg, quality grade, payment status). Talking point: *seeds are 40–50% of cost and farmer payments are tracked — traceability starts here.*
6. **Stock Counts:** plan → execute → reconcile a count. Talking point: *scheduled physical verification with variance analysis keeps the ledger honest.*

**Let them click:** have the ops person find available stock for a product and raise a transfer.

**Handoff:** *"Let me pull back to the owner's view — everything you just saw, rolled up."*

### 65–80 min — Owner closer (admin login)

1. **Inventory Dashboard:** KPIs, today's production, low stock, expiring batches, QC pending. Mention the 30-second auto-refresh. Talking point: *this is the one screen to open every morning.*
2. **Reports → Overview/Analytics + Standard Reports:** inventory summary (valuation), production yield (by bull/operator/weather), FSSAI compliance. **Custom report builder** + CSV export + scheduled reports. Talking point: *monthly review runs itself — reports arrive on schedule.*
3. **Settings:** reorder rules, expiry policy, users/roles. Talking point: *new staff, new rules — no code changes.*

**Handoff:** *"Last thing — what your customer actually experiences."*

### 80–90 min — Storefront + wrap (public storefront, then admin)

1. Open the storefront — locally at `http://localhost:4173` (or the live site root). Show the home and products. Talking point: *customers only ever see this — and everything on it, photos, descriptions, banners, the team can now update themselves from the admin's Media & Content section, no developer needed.* If time allows, change a headline in Site Content and refresh to prove it.
2. In the `cust` tab on the admin URL: a friendly 403 — RBAC enforced server-side, not just hidden in the UI.
3. **Wrap (3 min):** recap in one loop — *farmer → seed → bull → press → bottle → stock → customer, with traceability, quality gates, and cost capture at every step.*
4. Next steps: pilot scope, data migration from their current records, training plan, go-live timeline. Agree the follow-up date before leaving the call.

---

## Contingencies

| Problem | Response |
|---|---|
| Local backend/Vite dies | Switch to live URLs (browser history has them). Warn about cold start; hit `/q/health` once, wait for 200, then demo on the live frontend. |
| Demo data dirtied mid-demo | Restart backend dev (fresh H2) or rerun E2E script to reseed; takes <2 min. Say *"I'm resetting to the demo dataset"* — clients respect clean data. |
| Live backend cold (first hit slow) | Pre-warm during opening RBAC segment; narrate while it wakes. |
| Client asks for something not built | Note it visibly (shared doc), say it's on the roadmap; never improvise a date. |
| Running behind | Cut, in order: operators attendance (5 min), custom report builder (3 min), stock count execute (5 min). Never cut traceability or QC hold/release. |
| Question you can't answer | "Good question — I'll confirm and come back to you within 24h." Then actually do. |
| Live media upload returns 503 | R2 credentials aren't set in the Render dashboard yet — demo uploads on the **local** backend instead, and say so. |
| R2 bucket CORS | One-time setup: the bucket must allow `PUT` from the GitHub Pages origin (spec rollout checklist). |

## Rules of the room

- You drive the screen; only hand over in the designated *"let them click"* moments.
- One browser, admin window first; incognito and cust tabs pre-positioned.
- Never say *"this is just a demo"*. Say *"this is the seeded demo dataset"* when data is questioned.
- End on time. The wrap + next-steps segment is non-negotiable — it's where the sale happens.
