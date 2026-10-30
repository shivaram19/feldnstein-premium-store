# Guiding the Client Through the Web UI — UX Playbook for the CSM

Companion to `demo-runbook.md`. The runbook says *where* to go; this says *how to guide* — how to move the client's eye, narrate while navigating, and use the UI's own UX patterns as proof of quality. Pairs with `role-page-matrix.md`.

---

## The five guiding principles

1. **Narrate before you navigate.** Say what you're about to show *before* clicking. A click without narration reads as random clicking; narration before the click reads as expertise. Formula: *"To answer 'where did this bottle come from', we open…"* → click.
2. **One idea per screen.** Don't explain a whole page at once. Land, point at one element (cursor rest, not circling), make one point, move on. Three points per screen maximum — park the rest for Q&A.
3. **Let the UI do the talking.** The interface has deliberate UX patterns; name them as benefits instead of describing clicks:
   - *Status pills everywhere* → "state is always visible at a glance — nobody has to open a record to know where it stands."
   - *The gold button is always the next action* → "every screen has one obvious next step."
   - *Submit stays disabled until the form is valid* → "the system prevents bad data instead of complaining after."
   - *Confirm dialogs on ledger writes* → "anything permanent asks before it acts."
   - *Skeleton loaders, never blank screens* → "the UI always tells you it's working."
   - *Sticky table headers on long lists* → scroll a 500-row ledger and keep the columns visible.
4. **Point with purpose.** Rest the cursor on the thing you're talking about. Use browser zoom (Ctrl +/−) for dense tables — 110% for a shared screen.
5. **Hand over at the "let them click" moments only.** You drive; they touch in the designated spots (runbook marks them). Guide their click: *"Open the batch… now press Advance — notice it asks you to confirm."*

---

## Navigation mechanics (know your tools)

- **Hamburger (☰) in the topbar** toggles the sidebar. On a shared screen, keep the sidebar **open** during the demo — the client should always see where they are in the product. Collapse it only to show off extra table width, then say why you did it.
- **Section pills** (e.g. Reports → Overview / Standard / Custom / Scheduled) are secondary navigation — introduce them as tabs: *"one page, four lenses."*
- **Filter pills with counts** (Batches by status, Prices by type, Audit by action) — click one and narrate the count change: *"fourteen batches are waiting on QC right now."* This is a strong live moment.
- **Escape / Cancel always works** — if a modal is open, Cancel is safe; nothing half-saves.

---

## Per-segment UI cues (maps to the runbook)

### Opening + RBAC (0–5)
Land on the dashboard signed in as **admin**. Toggle to the incognito **ops** window for the nav contrast — the sidebar itself shrinks. Say: *"the menu is smaller because the role is smaller — the server enforces it too, not just the UI."*

### Traceability (5–12)
Open **Reports → Standard Reports → Inventory / Production Yield**, then the traceability view. Scroll the table slowly — sticky headers keep columns legible. Land the line: *"one record, farmer to customer."*

### Production (12–30)
- **Batches:** click a filter pill first (e.g. QC PENDING) so the list visibly reacts. Advance a status and **pause on the confirm dialog** — it's your forward-only gate made visible.
- **Create Batch modal:** point at the disabled gold button before the form is filled: *"it won't let you file an incomplete pressing session."* Then fill it live.
- **Bull & Press:** the 4-hour pill turns red over the limit — point at it: *"welfare compliance is in the data, not in a notebook."*

### Quality (30–45)
The **temp < 40 °C pill** (green "cold-press ✓") is the money shot of this segment — zoom if needed. Hold & Release: narrate *"held stock can't be sold, and it says so right here."*

### Procurement / inventory (45–65)
- **Stock Levels:** the available column pill flips red under 10 — say *"customer service looks here before promising delivery."*
- **Transfer / Adjustment:** fill the form, click Post, and **let the confirm dialog do the trust work** — read the summary aloud: *"it tells you exactly what will be written to the ledger before it does it."* Ledger writes are permanent; the UI treats them that way.
- **GRN:** tell the 3-way match story with the PO select.

### Owner closer (65–80)
Dashboard KPIs auto-refresh every 30 s — if a number changes mid-sentence, use it: *"see, it just refreshed — this is live data."* Reports: headers are plain English, numbers are formatted INR — zoom out to show the whole formatted table, then Download CSV as the closer.

### Storefront (80–90)
One tab, customer view only. Land the RBAC message: *"your customer never sees any of the previous 80 minutes — and neither does a staff login that tries."*

---

## If the UI misbehaves live

| Moment | What you say |
|---|---|
| Skeleton shows >3 s | "It's reloading the live dataset — the shimmer tells you it's working, not hung." |
| Error line appears | "The server rejected that — see how it says why in plain words instead of a crash?" (then Retry) |
| Someone asks to click somewhere off-script | Let them — the confirms and validation make free exploration safe. That's the point. |
| You got lost in navigation | Click the hamburger off/on, or go back to the dashboard: *"everything is one click from home."* |

## Accessibility notes (use only if asked)
Keyboard-focus rings, Escape-to-close dialogs, and reduced-motion support are built in — one sentence is enough: *"it's built to the same standards as consumer software."*
