# 0024. Storefront product detail pages (PDP)

- Status: accepted

## Context

The storefront (`feldnstein-react`) listed products in a carousel with only a
quick-view modal for details. The owner wants a full product page per oil
(reference: anveshan.farm PDP) — image gallery, price/MRP/discount block,
quantity-variant grid, quantity stepper, Add to Cart / Buy Now, a real product
description, nutrition facts, and trust badges — opened by clicking a product
card on the home page. Product/variant facts (nutrition, "perfect for",
ingredients, storage, shelf life) come from the FELD N STEIN label artwork.
What is NOT being decided: checkout flow, review system, related-products
rail, backend-managed PDP content.

## Decision Drivers

- Parity with the reference e-commerce PDP layout the owner supplied.
- Honesty (§3.8): no fabricated ratings/review counts — the rating row renders
  only when real per-product rating data exists.
- Must work with and without the live backend (static fallback is the
  documented offline/demo mode).
- Reuse the existing design system (brand tokens, three canonical buttons).
- No new runtime dependencies (YAGNI §3.2).

## Considered Options

1. Extend the existing hash view-state with a `product` view (`#product/<id>`)
   — strengths: consistent with cart/checkout/track back-button behavior
   already in `CartContext`; zero new deps. weaknesses: hand-rolled routing
   must be extended carefully for id params.
2. Adopt react-router — strengths: industry standard, URL params for free.
   weaknesses: new dependency and a routing rewrite for a 5-view site; the
   current hash system already gives linkable views + back button.
3. Do nothing — quick-view modal stays the only detail surface; cost: fails
   the owner's explicit requirement.

## Decision

Option 1. A `product` view keyed by `#product/<id>` reuses the existing
view ↔ hash machinery (linkable, back/forward safe). Rich PDP content
(description, variant labels/MRPs, nutrition, gallery) lives in static
`src/data/products.js` as the canonical source; `ContentContext` merges live
API variant prices/ids by `sizeMl` on top, so the PDP is rich offline and
prices stay server-authoritative when the API is up. The PDP mirrors the
reference layout but renders the rating row only when rating data exists.

Options and the draft implementation were produced by an AI assistant
(Kimi Code) from the owner's reference screenshot and label artwork; the named
human owner (shivaram19) reviewed and remains accountable. Principle carried
most weight: evidence over intuition (no invented ratings/pricing claims) and
YAGNI (no router dependency).

## Consequences

Product cards on the home page now navigate to the PDP; Quick View is kept as
a shortcut. Variant grid, nutrition and badges are static content — updating
them means a code edit until a CMS-backed PDP is justified. Two-way door:
revisit if the backend starts serving PDP content or reviews, or if the site
grows past ~10 views (then a real router wins). Evidence that would reopen:
owner-managed content changing more often than releases.
