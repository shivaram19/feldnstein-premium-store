# 0025. PDP component architecture — Radix primitives, custom components for the rest

- Status: accepted

## Context

The product detail page (PDP) was rebuilt from a component-level teardown of a
leading Indian D2C competitor's product page (Anveshan, Shopify; ~90 leaf
segments). The build must match that component granularity while staying inside
the existing storefront architecture: hand-rolled hash routing, Tailwind +
brand tokens, strict bundle discipline, no second design system (ADR-0022).

## Decision Drivers

- Accessibility is non-negotiable for commerce (keyboard nav, focus trapping,
  ARIA) — but writing it by hand for every interactive pattern is error-prone.
- Radix primitives are unstyled behavior-only components; styling them with our
  Tailwind tokens does NOT import a second design system (unlike shadcn/ui,
  rejected in ADR-0022 — that decision stands; this is a different layer).
- Every PDP component is a business decision: each maps to a conversion or
  trust job evidenced in the competitor teardown (USP chips = 3-second trust;
  price ladder = offer clarity; FAQ = objection handling + SEO; comparison
  table = whole-catalog cross-sell; sticky ATC = mobile conversion).

## Considered Options

1. **Radix primitives + hand-built custom components, brand-styled** — a11y
   handled by battle-tested primitives; custom pieces get Radix-level care
   (states, keyboard, focus, reduced-motion). **Chosen.**
2. Hand-rolled everything — full control, but we re-implement focus traps and
   roving tabindex for marginal benefit. Rejected.
3. shadcn/ui full adoption — pre-built design system that would fight our brand
   tokens; already rejected for the Select use-case in ADR-0022. Rejected.

## Decision

Adopt `@radix-ui/react-accordion`, `@radix-ui/react-dialog`,
`@radix-ui/react-radio-group`, `@radix-ui/react-separator`,
`radix-ui/react-visually-hidden` as the behavior layer for PDP interactions
(GalleryLightbox = Dialog, FAQ + product info = Accordion, VariantSelector =
RadioGroup). Build the non-Radix components by hand with the same rigor:
USPChips, PriceBlock (3-tier ladder + coupon badge), QuantityStepper,
StickyATCBar, ComparisonTable, OfferBadge. All styling uses existing brand
tokens; all animations respect `prefers-reduced-motion`; every component
documents its business job in its header comment. Options generated with AI
tooling; named human owner accountable (§6).

## Consequences

- Bundle grows by the five small Radix packages (~15–25KB gzipped total);
  monitored via build output.
- PDP test IDs (`detailPrice`, `detailQty`, `detailAddBtn`, `variantGrid`,
  `nutritionTable`, `productStory`…) are preserved — `smoke-test.mjs` and
  `scripts/ui-flow-tests.js` depend on them.
- Two-way door: Radix usage can expand to the rest of the storefront
  (Select.tsx from ADR-0022 could migrate onto RadioGroup/Select primitives)
  or be removed per-component without data-model changes.

## Amendments

- 2026-11-15: Footer decomposed into `src/components/footer/` segments
  (Brand / LinkGroup / Support / Bottom, Radix `Separator` for the divider)
  and footer "Policy & Info" links became real `#policy/<key>` destinations
  (PolicyView, FAQ on the Radix Accordion wrapper) — same Radix-primitives +
  brand-styling pattern applied beyond the PDP; one-way door avoided, no new
  dependencies.
