# Role × Page Matrix — Client Demo Cheat Sheet

Print one per person at the table. URLs are relative to `http://localhost:5173` (local primary) or `https://shivaram19.github.io/feldnstein-premium-store/` (live backup). Logins: **admin/admin123** · **ops/ops123** · **cust/cust123**.

| Nav section | Page(s) | Show to | Login | One-line "why it matters to you" |
|---|---|---|---|---|
| Inventory Dashboard | Dashboard | Owner | admin | Your morning screen: stock, production, QC queue, alerts — auto-refreshing. |
| Reports | Traceability | Owner, Quality | admin | Farmer → bull → press → bottle → customer, one record. Your differentiator. |
| Reports | Standard / Overview / Custom | Owner | admin | Valuation, yield analysis, FSSAI compliance, CSV + scheduled delivery. |
| Audit Log | Audit Log | Owner, Quality | admin | Every change recorded with who/when — disputes and audits settled in one lookup. |
| Batch & Production | All Batches / Create | Production | admin | Every pressing session recorded with full cost — the heart of traceability. |
| Batch & Production | Status advance / Bottling | Production | admin | Forward-only gates: no step can be skipped; bottling creates sellable stock. |
| Batch & Production | Bull & Press / Operators | Production | admin | Bull welfare limits, work logs, press maintenance, attendance & wages. |
| Quality Control | QC Dashboard / Lab Tests | Quality | admin | Aflatoxin, pesticide, moisture, pressing temp < 40 °C — proof of cold-pressed. |
| Quality Control | Hold & Release | Quality | admin | Failed stock is blocked from sale automatically. |
| Alerts | Active Alerts | Quality, Owner | admin | Low stock and expiry warnings before they become write-offs. |
| Stock Levels | Overview / Detail / Reserved | Procurement | admin or ops | Sell only what you have; batch genealogy per position. |
| Movements | Ledger / Transfer / Adjustment / GRN | Procurement | admin or ops | Immutable trail; warehouse transfers; damage capture; 3-way match on receipts. |
| Procurement | Seed / POs / Suppliers | Procurement, Owner | admin | Farmer payments & quality grades; packaging POs; 40–50% of cost visible. |
| Stock Counts | Plan / Execute / Reconcile | Procurement | admin | Scheduled physical counts with variance analysis. |
| Warehouses | List / per-warehouse | Procurement | admin or ops | Every batch sits in a known location; movements have from/to. |
| Storefront (separate tab) | Home / products | All | cust | What the customer sees — the only thing customers see. |

## Segment timing (90 min)

| Min | Segment | Lead |
|---|---|---|
| 0–5 | Opening + RBAC proof | You (admin vs incognito ops) |
| 5–12 | Traceability story | Owner |
| 12–30 | Production supervisor | Production |
| 30–45 | Quality / FSSAI | Quality |
| 45–65 | Procurement / inventory | Procurement |
| 65–80 | Owner closer: dashboard, reports, settings | Owner |
| 80–90 | Storefront + wrap + next steps | You |

**If behind, cut in order:** operator attendance → custom report builder → count execution. **Never cut:** traceability, QC hold/release, wrap.
**Full detail:** `docs/client-success/demo-runbook.md`
