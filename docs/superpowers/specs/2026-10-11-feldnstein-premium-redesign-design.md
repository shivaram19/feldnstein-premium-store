# FELDnSTEIN Premium Store Redesign — Design Spec

Date: 2026-10-11
Source: `feldnstein_premium_store/code.html` (single-file build, kept as snapshot)
Approach: Full redesign, Option A — Editorial Grid System
Goal: Apply three principles of premium-web psychology to the FELDnSTEIN store:

1. **Halo effect** — engineer the above-the-fold first impression (editorial authority).
2. **Cognitive fluency** — reduce mental effort: one focal point per section, simplified nav, consistent geometry and spacing.
3. **Peak–end rule via micro-interactions** — small moments of delight: scroll reveals, hover feedback, smooth modal, cart confirmation.

## Decisions (locked)

- **Scope:** Full redesign of all sections. Existing content (copy, products, images, comparison data, testimonials) is retained, re-editorialized into the new layout.
- **Hero feeling:** Editorial authority — oversized Newsreader serif, structured grid, one primary CTA.
- **File structure:** Split project (index.html / css/styles.css / js/main.js). Tailwind via CDN with config; custom styles in the stylesheet.
- **Motion:** CSS transitions + light vanilla JS (IntersectionObserver reveals, header state, carousel sync, modal, toast). `prefers-reduced-motion` disables all scroll animation.

## 1. Architecture & files

```
feldnstein_premium_store/
├── index.html          # semantic structure; no inline styles/scripts
├── css/styles.css      # design tokens as CSS variables, Tailwind config
│                       # extensions, editorial component classes, animations
├── js/main.js          # all behavior (vanilla JS, no dependencies)
└── code.html           # original single-file snapshot — do not modify
```

- Tailwind CDN (`cdn.tailwindcss.com`) remains, configured in a small inline config script in index.html; brand tokens (colors, fonts, radii) defined once in the config and mirrored as CSS variables in styles.css for non-Tailwind contexts.
- Fonts: Newsreader (display serif) + Plus Jakarta Sans (UI sans) + Material Symbols Outlined, via Google Fonts — same families as the original.
- Images: reuse the existing remote image URLs from code.html (Unsplash + Google-hosted). No new assets required.
- No build step. Opening index.html in a browser must work.

## 2. Header & navigation

- Slim masthead: Newsreader wordmark left; nav row of exactly four links — Shop, Our Standard, Journal, Club — plus a single bag icon with cart count on the right.
- Sticky with glassmorphism (cream `rgba(252,251,247,0.88)` + blur + ochre-tinted hairline border), per original DESIGN.md.
- On scroll past ~40px: header shrinks (reduced padding), gaining blur/density.
- Active section link highlighted via scrollspy (IntersectionObserver).
- Mobile: hamburger toggling a full-width cream dropdown with the four links; no mega-menu.

## 3. Hero (above-the-fold halo)

- Layout: asymmetric 12-col grid (7/5 split on lg, stacked on mobile).
- Left column: small-caps kicker "Farm-Direct • Lab-Tested • Small Batch" (Plus Jakarta Sans, letterspaced, ochre); oversized Newsreader headline "Purity, verified at the source." with one italic accent word; one supporting sentence; primary pill CTA "Shop the Reserve" + ghost secondary "Our Standard".
- Right column: art-directed imagery inside the brand's arched frame (`border-radius: 999px 999px 24px 24px` on lg); floating "Lab Verified · Batch 042" pill badge with ambient green-tinted shadow.
- Trust marquee ticker sits **below** the hero, not above it.
- Full viewport height on desktop (min-h ~88vh), no clutter above the fold.

## 4. Sections (numbered, editorial headers)

Every content section gets a uniform section header: hairline rule, small-caps numbered label ("01 — The Absolute Reserve"), Newsreader headline with italic accent word, one supporting paragraph. Sections in order:

1. **The Absolute Reserve** (`#collection`) — arched product cards retained as the brand's signature geometry; aligned to grid; consistent image ratios; category filter pills + horizontal carousel with synced progress dots (kept from original); quick-view modal.
2. **From Native Seeds to Culinary Gold** (`#process`) — process/category cards rebuilt on the grid with uniform card padding and icon treatment.
3. **What Goes Into Your Cooking Matters** (`#matrix`) — comparison table kept (Mass Market vs. FELDnSTEIN); simplified header row; consistent red/green column treatments; row hover highlight retained; sticky-free, single scroll flow.
4. **Subscription club** (`#subscription`) — membership card rebuilt on grid; gold accent CTA reserved for conversion actions.
5. **Testimonials** (`#testimonials`) — uniform white cards, forest-green 5-star ratings, circular avatars, Newsreader quotation styling; consistent card heights.
6. **App download / footer** — deep forest (`#0d3822`) footer block as grounding weight; QR/app module retained; simplified link columns (Shop, Company, Support, Legal); newsletter input uses canonical pill input style.

## 5. Cognitive fluency rules (global)

- One focal point per section; no competing hero CTAs.
- Spacing rhythm: 24px card padding (16px mobile), 64–96px between sections, 48px outer canvas margin desktop / 20px mobile.
- Buttons: exactly three canonical styles — primary pill (forest fill), gold accent pill (purchase/subscription only), ghost pill (1.5px forest outline).
- Type: Newsreader only for display/headlines; Plus Jakarta Sans for all UI, data, labels. Italic serif accent word in each headline.
- Nav: four items max; footer link columns simplified to 4 groups.

## 6. Micro-interactions (CSS + light JS)

- Scroll-reveal: elements with `data-reveal` fade+rise (≤16px, ≤600ms ease-out) once via IntersectionObserver; staggered within grids via transition-delay.
- Header shrink/blur on scroll.
- Buttons: hover fill + subtle lift; focus-visible ring `rgba(24,78,50,0.12)`; active state press scale (0.98).
- Cards: hover image scale (1.03–1.05), ambient shadow per DESIGN.md (`0 8px 24px -4px rgba(24,78,50,0.06)`).
- Carousel: smooth scroll, progress dots sync (kept behavior, restyled).
- Quick-view modal: fade+scale open, backdrop click / Esc / close button to dismiss.
- Cart: toast notification "Added to Reserve Cart" with product name (peak-end moment), auto-dismiss 2.5s; bag count increments with a small pop animation.
- `prefers-reduced-motion: reduce` disables reveals, parallax-like motion, and pop animations (content shown statically).

## 7. Palette & tokens

Unchanged from DESIGN.md: forest `#184e32`, deep forest `#0d3822`, ochre `#c59b27` / deep `#b8860b`, ivory `#fcfbf7`, warm card `#f7f5ee`, white `#ffffff`, herb green `#246942`, terra rust `#bc4747`, charcoal `#222522`, hairline `#e9e5d9`. Radii: pill 999px, arch-top `999px 999px 24px 24px` (lg) / `120px 120px 20px 20px` (mobile), card 24px.

## 8. Out of scope

- New imagery, photography, or copywriting (existing content retained; minor headline tightening allowed where noted above).
- E-commerce backend, real cart persistence, checkout.
- Framework migration (React/Vue) or build tooling.
- Pages other than the homepage (shop, journal, product detail remain future work).

## 9. Success criteria

- index.html renders the full page standalone (file:// open works) with no console errors.
- All original content sections present; halo/fluency/motion principles visibly applied per spec.
- Responsive at 375px, 768px, 1280px: no horizontal overflow, hero reflows to stacked single column.
- Animations respect `prefers-reduced-motion`.
