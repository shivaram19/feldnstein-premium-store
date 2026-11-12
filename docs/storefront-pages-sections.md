# Storefront Pages & Sections — E-commerce Norms vs Current State

Reference inventory for the UI/UX overhaul. **Legend:** ✅ exists · ⚠️ exists but thin/partial · ❌ missing
Backend capability behind each item is noted where it already exists.

## Pages (routes/views)

| # | Standard e-commerce page | Status | Notes |
|---|---|---|---|
| 1 | Home / landing | ✅ | Hero, ticker, process, collection, subscription, testimonials |
| 2 | Shop / category listing (PLP) | ⚠️ | Collection section only; no dedicated shop page with filters/sort |
| 3 | Product detail (PDP) | ⚠️ | QuickView modal only — no full PDP (URL-shareable, SEO-able) |
| 4 | Cart | ✅ | Drawer (redesigned w/ thumbnails + empty state) |
| 5 | Checkout | ✅ | Single-page: address → demo/Razorpay pay → confirm |
| 6 | Order tracking | ✅ | Order code + email lookup; status timeline |
| 7 | Account / login (customer) | ❌ | No customer accounts; loyalty via order-code lookup (by design so far) |
| 8 | Order history (account) | ❌ | Admin-side only today |
| 9 | About / brand story | ⚠️ | Process + creed sections on home; no dedicated page |
| 10 | Journal / blog (SEO) | ❌ | Nav says "Journal" but anchors to process section — mislabeled |
| 11 | FAQ / support | ❌ | WhatsApp link is the only support surface |
| 12 | Contact | ⚠️ | Footer WhatsApp/phone/email only |
| 13 | Shipping & returns policy | ❌ | No policy pages (legal/SEO gap) |
| 14 | Privacy / terms | ❌ | No legal pages |
| 15 | Loyalty / rewards explainer | ❌ | Loyalty works (earn 5% on delivered, redeem ₹1/pt) but never explained to customers |
| 16 | Subscription management | ⚠️ | Subscribe form exists; no manage/pause/cancel for customer |
| 17 | Wishlist / save for later | ❌ | Not present |
| 18 | Search | ❌ | No search (catalog is small today) |

## Home-page sections (current order)

1. Header (sticky; nav: Shop / Our Standard / Journal / Club — ⚠️ labels don't match targets: "Journal" → #process, "Club" → #subscription)
2. Hero (video + headline + CTAs) ✅
3. Ticker (marquee claims) ✅
4. Process — 5-step diagram (bull removed → static press diagram) + 4 phase cards ✅
5. Creed / manifesto ⚠️ (copy-heavy, low conversion utility)
6. Matrix — comparison table ("Our Standard") ✅
7. Collection — product carousel with variants, add-to-cart, quick view ✅
8. Subscription — plans ⚠️ (plans are hardcoded; backend has no subscription plans table)
9. Testimonials ✅
10. Footer — links, WhatsApp, certifications ✅

## Functional gaps that block "real e-commerce" UX

- **PDP**: needed for SEO, sharing, richer conversion; backend already serves `/site/products` with longDesc — mostly frontend work.
- **Customer accounts**: unlocks order history, loyalty self-service, address book. Backend has contacts + orders-by-email — a lightweight magic-link or OTP login would suffice.
- **Journal**: backend has media + content blocks; a content-driven journal is feasible later. Until then, rename the nav label to what it actually targets.
- **Policies**: static pages; cheap and expected by payment gateways/ads.
- **Wishlist/subscription management/search**: defer until catalog volume justifies.

## Immediate UX fixes applied this round

- Bull animation removed from process diagram (static press + step ring kept).
- Cart drawer: product thumbnails, item counts, GST line with rate, remove-under-name,
  empty state with CTA, "continue browsing" link.
- Hero content restored (was polluted by test-run copy).

## Proposed next visual-priority order

1. Nav label honesty (Journal → "Process", Club → "Subscribe") or wire real targets.
2. Dedicated shop page + PDP (biggest conversion/SEO lever).
3. Footer policy pages + FAQ accordion.
4. Loyalty explainer strip at checkout ("you'll earn X pts on this order").
