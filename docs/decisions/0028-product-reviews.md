# 0028. Product reviews — the last missing conversion lever

- Status: accepted

## Context

Every research document in this repo names the reviews backend as the
largest documented conversion lift available to the storefront
(Spiegel Research Center, Northwestern 2017: displaying reviews raises
conversion, up to ~270% for higher-priced products; purchase likelihood
peaks in the 4.0–4.7 band). The PDP has rendered ratings only when real
data exists since ADR-0024 — `products.js` carries `rating: null` by design.
Only the data pipe was missing.

## Decision Drivers

- Spiegel/Northwestern effect is strongest exactly where this store lives
  (premium-priced staples).
- Authenticity doctrine: ratings render only from real rows — never seeded
  perfection (a suspicious 5.0 reads as fake; same research program).
- Trust requires moderation: public submission exists but only approved
  reviews render.
- Present-age alignment (see citations-verified §D): reviews are the
  cross-platform trust layer buyers check before purchase.

## Considered Options

1. **Backend table + moderated read API + public submit** — one entity,
   one migration with seeded *imperfect* reviews (4–5 stars, named buyers),
   admin approve endpoint. Weakness: moderation is manual until the admin
   UI catches up.
2. **Unmoderated instant publishing** — rejected: fake-review contamination
   would poison the exact trust asset being built.
3. **Third-party review widget** — rejected: ships the store's most valuable
   trust content to an external domain, breaks the batch-genealogy story.
4. Do nothing — the highest-value documented lever stays unbuilt.

## Decision

Option 1. `product_review` (FK → oil_product), `GET
/shop/products/{id}/reviews` renders approved rows + summary (avg, count);
`POST /shop/reviews` stores pending; admin endpoints list/approve. Seeded
reviews are deliberately imperfect (4s and 5s, real-town names, dated) per
the Spiegel credibility band. Frontend renders a review section on the PDP
only when the API returns rows — the null-by-design contract is unchanged.

## Consequences

- PDP gains social proof with zero dark-pattern risk.
- The storefront↔backend product mapping is a static id map
  (groundnut→1, sesame→2, coconut→3; sunflower unmapped until the backend
  catalog grows) — documented in code, replaced when the catalog API unifies.
- Moderation is API-level until an admin screen exists; seeded reviews keep
  the PDP alive meanwhile.
- Two-way door: the table and endpoints support verified-purchase flags and
  media later without schema churn.
