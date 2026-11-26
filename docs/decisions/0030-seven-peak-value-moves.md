# 0030. Seven peak-value moves (measurable bundle)

- Status: accepted

## Context

`docs/section-value-derivation.md` ranks seven remaining moves that transfer
already-built backend capability (ADR-0028 reviews, V23 released batches) or
close documented funnel gaps (Baymard #27, §C UPI, §D.3 vernacular) to the
surfaces where attention already is. This ADR bundles them and — per the
owner's directive — attaches a **measurable impact hypothesis and a
measurement instrument** to every change, so each introduction is a testable
claim, not a belief.

## Decision Drivers

- Every change must state an expected impact range, its evidence class
  (peer-reviewed / practitioner / first-party baseline), and the exact metric
  that proves or kills it.
- Prefer transferring existing backend truth over inventing new state
  (YAGNI, first-principles §3.2).
- Honesty constraint: no fabricated scarcity, no invented shipping charges —
  if the backend doesn't charge shipping, the cart component must say so
  truthfully rather than manufacture a threshold.

## Considered Options

1. **Ship all seven as one bundle with per-move metrics** — fast; attribution
   per move requires the instruments below, not pre-ship A/B isolation.
2. **Ship sequentially with A/B isolation per move** — cleanest attribution;
   costs weeks the client demo doesn't have.
3. Do nothing — the ranked list stays a document; the reviews backend built
   in ADR-0028 stays invisible at the decision surfaces (#7 mechanism
   starves).

## Decision

Option 1. Each move lands behind its own test-id and, where possible, a
first-party event hook so post-launch analysis can isolate effects. Impact
hypotheses (evidence class in brackets):

| # | Move | Expected impact | Evidence | Instrument (what we measure) |
|---|------|-----------------|----------|------------------------------|
| 1 | Rating counts on grid cards + PDP header | +5–15% grid→PDP CTR; reviews displayed lift conversion up to ~270% for higher-priced goods (ceiling, not expectation) | [peer: Spiegel #7] | `data-testid=card-rating` impressions vs PDP opens; PDP→ATC rate before/after |
| 2 | Quantified subscription incentive (10%, matches CustomerOrder 10% discount) + "skip anytime" microcopy | Subscribe adoption 2–4× vs unquantified toggle; subscription customers ~4.1× LTV | [practitioner: Similarweb S&S +20pp grocery; LTV 4.1× directional] | toggle-on rate at PDP; 90-day subscriber retention |
| 3 | UPI-intent payment path (demo gateway) | Pay-step completion +10–25% vs card-form-only flow; every removed step recovers abandonment | [context: UPI = ~49% of world real-time volume, §C; #27] | pay-step start→done rate; abandonment at `payment-step` |
| 4 | Cart: truthful "free shipping, no minimum" line + complement cross-sell | AOV +5–12% via complement attach; anxiety removal unmeasurable alone | [practitioner: Baymard cross-sell relevance; #27 extra-costs #1] | attach rate of cross-sell card; AOV before/after |
| 5 | Telugu body-copy slice (hero sub, section intros, subscription, footer line) | Vernacular-first buyers are the fastest-growing segment; chrome-only Telugu is the smaller half of the lever | [context: §D.3 Google/KPMG direction] | Telugu-toggle sessions' conversion vs English baseline |
| 6 | Review-request entry points (Account orders + confirmation) with verified-buyer flag (V24) | Review supply: from ~0 organic/month to 5–15% of delivered orders; verified badge raises credibility of new reviews | [peer: #7 credibility band; mechanism: supply] | reviews submitted/month; % with orderCode; approval queue depth |
| 7 | Farmer genealogy on PDP (V24 extends `/shop/products/{id}/batch`) | Dwell time on fact cards; provenance is the premium defense (§D.2) — directional, not a % claim | [peer: #6 indexical authenticity] | fact-card visibility events; PDP scroll depth |

Backend changes: V24 migration (`product_review.order_code`,
`product_review.verified_buyer`), optional `orderCode` in ReviewDraft
(validated against order lines → verifiedBuyer), batch endpoint extended with
farmer name/place from the existing `ProductionBatch.farmer` link. No new
tables, no identity columns (ADR-0006 convention respected).

## Consequences

- Two-way door: all seven are UI/presentation over existing aggregates; each
  can be reverted independently by removing the component mount.
- Known limitation (documented, accepted): review submission is anonymous —
  `orderCode` proves *an order existed for that product*, not that the
  submitter owns it. Binding reviews to customer identity is deferred until
  post-moderation abuse is observed.
- UPI intent uses `VITE_UPI_VPA` (fallback `feldnstein@upi`) and the existing
  demo-pay confirmation; real UPI verification (Razorpay UPI intent with
  signature) is the production hardening path.
- Shipping: the cart ships a progress bar against the ₹499 free-shipping
  threshold the PDP badge already asserts — visualizing an existing promise,
  not manufacturing a new one. (Initial draft claimed the threshold would be
  fabricated; that was factually wrong — `FREE_SHIPPING_THRESHOLD` predated
  this ADR in the PDP trust badges. Amended in place per doctrine.)
- Measurement gap acknowledged: no analytics beacon exists yet; the
  instruments above are test-ids + first-party API counters. A lightweight
  events endpoint is the follow-up if attribution is demanded.
