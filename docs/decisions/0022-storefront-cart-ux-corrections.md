# 0022. Storefront cart UX corrections — increment-on-add, cart page, canonical input style

- Status: accepted

## Context

Live review of the storefront (2026-11-12) surfaced four defects that all trace to the same gap: storefront UI was built against design tokens that were never defined, and cart semantics were inherited from an internal "set quantity" API rather than e-commerce conventions:

1. Cart drawer panel rendered transparent — `bg-brand-cream` is used in `CartDrawer.tsx` and `CheckoutView.tsx` but `cream` was never added to the Tailwind palette, so the class generated no CSS.
2. "Add to Cart" on a product already in the cart silently reset its quantity to 1 — `POST /shop/cart/add` called `CartService.setItem` (absolute set semantics) instead of incrementing.
3. `.input` class is used by `TrackOrder.tsx`, `CheckoutView.tsx`, and `AddToCart.tsx` but was never defined in `index.css` — inputs render as unstyled browser defaults with no borders or focus states.
4. Header nav links (`#collection`, `#matrix`, …) are dead on the `track` and `checkout` views because those sections only exist in the home view's DOM.

Also decided here: a full cart page (e-commerce norm — review the whole basket before checkout) as a third shop view alongside the slide-over drawer.

## Decision Drivers

- E-commerce convention: "add to cart" increments; absolute quantity set belongs to the cart's own steppers (the existing `PUT /shop/cart/items/{variantId}` keeps set semantics).
- No new dependencies (first-principles §3.2, YAGNI): the repo's design system is Tailwind + CSS component classes; extend it rather than adopt a component library for one input style.
- Client demo readiness; two-way door (all changes are code-level, revertable).

## Considered Options

1. Fix semantics in backend `/cart/add` (increment) — matches every major storefront (Amazon/Flipkart/Shopify); PUT endpoint keeps absolute set. **Chosen.**
2. Fix in frontend (read cart, compute qty, call PUT) — works but leaves a non-conventional API that third parties/scripts would misuse; rejected.
3. Adopt a component library (e.g. shadcn/ui) for inputs — heavy new dependency for a single class; rejected per §3.2.
4. Do nothing — cart quantity resets look broken to users; inputs look unstyled; nav dead-ends on two views.

## Decision

Backend: `POST /shop/cart/add` increments the existing line quantity (still stock-validated); `PUT /shop/cart/items/{variantId}` unchanged (absolute set). Frontend: add `cream` to the Tailwind brand palette, define a canonical `.input` component class (1px border, rounded, focus ring in brand ochre/forest, placeholder styling) in `index.css`, make Header nav links switch to the home view and smooth-scroll to the section, and add a `cart` shop view (full-page cart) reachable from the drawer. Options and implementation were generated with AI tooling; the named human owner remains accountable (§6).

## Consequences

- Drawer and checkout panels get their intended cream background; inputs become consistent site-wide.
- Re-running the e2e suite against `/cart/add` expectations: the suite asserts cart contents after adds — increment semantics keep total quantities the same only when each add targets a fresh line; the flow scripts add each product once per cart, so totals are unchanged, but this must be re-verified.
- Out of scope: product detail page, shop page (still offered as follow-up).
- Follow-on: shop views are mirrored in the URL hash (`#cart`, `#checkout`, `#track`) so cart/checkout/track are deep-linkable with working back-button; section anchors remain home-view-only. Also fixed: `GET /shop/cart` was missing `@Transactional`, 500ing for any returning visitor with a non-empty cart token (lazy `ProductVariant.sku` access outside the session).
- Follow-on: the size selector is a custom `Select.tsx` built on the shadcn Select *pattern* (combobox trigger + floating listbox, keyboard nav, ARIA) rather than importing the library — one dropdown doesn't justify a second design system (Radix + CVA + tailwindcss-animate) beside the brand tokens. Also fixed in QuickViewModal: the big price now tracks the selected variant, and a wrapper `onClick={close}` that closed the modal on *any* click inside AddToCart (including opening the size dropdown) was replaced by an explicit `onAdded` callback.
- Follow-on (performance): ambient videos no longer autoplay at load/scroll — playback upgrades on first user interaction (tap/click/key), and lazy videos fetch their source only when near the viewport AND after interaction. Decode of ambient video on low-memory devices froze the page in testing; the poster is the designed visual until playback starts.
