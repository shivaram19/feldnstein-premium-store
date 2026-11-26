# 0031. Collection segregation rail (icon+label category navigation)

- Status: accepted

## Context

The collection section's category filter is degenerate: `categories` in
`src/data/products.js` contains exactly one entry (`All Oils`), so the
text-pill row renders a single non-choice. The owner pointed at Anveshan's
category rails (icon above label, active underline — "All / Gifting / Ghee /
Oils…" and the per-seed "Groundnut / Mustard / Sunflower…" row) as the
pattern to adopt: **segregation that removes eye work**.

## Decision Drivers

- Every change carries its mechanism and a measurable expectation
  (ADR-0030 doctrine); this one replaces a non-choice with a real decision
  aid, so it must not add Hick-style option load (Hick #19 guard: 5 anchors).
- Icons must be truthful (no-AI, real-product doctrine, §D.4) and
  recognition-first.

## Considered Options

1. **Text pills extended with oil types** — cheap; text-only forces reading
   before recognition, which is the exact eye work the owner wants removed.
2. **Anveshan-style line-icon rail (Material Symbols glyphs per seed)** —
   matches the reference; but no glyph truthfully reads as "coconut" or
   "groundnut", and invented icons read as decoration (banner-blindness
   risk, #32).
3. **Circular product-photo rail (Amazon/Myntra "shop by category" pattern)
   with label beneath and active underline** — recognition over recall at
   maximum: the buyer recognizes the bottle, not a symbol; doubles as a
   second product exposure; fully truthful. Cost: needs the empty `All`
   anchor handled separately (grid glyph).

## Decision

Option 3. The rail filters the carousel (`all` + one anchor per oil) with
the same show/hide display logic the pill filter used. Active state is a
brand-forest underline (Anveshan grammar). Smoke-suite selectors move from
the removed pill row to `data-testid` rail anchors. Principles carrying the
weight: evidence over intuition (§3.8), YAGNI (reuses existing filter
state; no new data model).

## Consequences

- Mechanism: pre-attentive shape/color recognition (Treisman, Feature
  Integration Theory, 1980) locates the target anchor before reading starts;
  dual coding icon+label (Paivio #17); recognition over recall (NN/g);
  chunking 5 anchors within working-memory comfort (Miller #21 read as
  "chunk, don't flood").
- Measurable expectation: rail interaction rate (test-ids `rail-item-*`) vs
  the old single-pill (zero choices); hypothesis: nonzero oil-anchor usage
  within the first session, i.e., the rail becomes a real navigation device
  rather than decoration.
- Two-way door: revert restores the pill row; no schema or API touched.
- The `categories` content entry stays in the data file but is no longer
  rendered; removing it is deferred to a content cleanup pass.
