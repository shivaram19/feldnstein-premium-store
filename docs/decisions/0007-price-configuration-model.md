# 0007. Price configuration model: effective-dated price_config table

- Status: accepted
- Amendment note: status amended from proposed on merge of PR #2

## Context

`product_variant` currently holds a single `mrp` column. Real commerce needs at least MRP, selling price, and cost price per SKU — and price *changes over time* must not rewrite history (an order placed yesterday keeps yesterday's price). The Phase-1 spec's product page also lists barcode/SKU-level commercial fields that pricing hangs off.

## Decision Drivers

- Price history is legally/financially relevant (invoices, MRP display rules, margins).
- Orders (future epic) must snapshot prices at order time; current-price lookups must be fast.
- Keep the variant table stable — pricing evolves independently of packaging/SKU attributes.

## Considered Options

1. **Columns on product_variant** (cost_price, selling_price, gst_pct) — simplest; destroys history on every change; rejected.
2. **price_config table**, one row per (variant, price_type), effective-dated, exactly one active row per pair — history preserved, lookup is "active row for variant+type"; chosen.
3. Full promotion-engine pricing rules — YAGNI (§3.2); revisit when a real promotion use case lands.

## Decision

Option 2. `price_config(variant_id, price_type [MRP|SELLING|COST], amount, gst_pct, effective_from, active)`, unique partial constraint enforced at application level for the demo (exactly one active row per variant+type). Prices are ex-GST amounts; GST is a rate on the row. Drafted with AI assistance; accepted by the project owner.

## Consequences

Easier: price changes become inserts, not updates; orders can later snapshot or reference the active row. Harder: every price read must filter `active` (mitigated by a named query / active-price endpoint later). Deferred: promotions, channel-specific pricing, price-change approval workflow.
