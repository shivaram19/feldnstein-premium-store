# Storefront Component Map — granular architecture × e-commerce UX research

Every component below exists to protect one scarce resource: the visitor's
attention, patience, and trust. Each entry maps the component to its business
job and to the behavioral research that shaped it. Evidence hierarchy:
peer-reviewed/university research > institutional research programs
(Nielsen Norman Group, Baymard Institute) > established cognitive laws
(Hick, Fitts, Miller, Gestalt).

The funnel frame: **Attention → Trust → Value comprehension → Commitment →
Post-purchase memory → Return**. Every component serves exactly one stage.

Per-piece justifications (citation → psychology → behavior → business value
→ intent conveyed) live in `docs/component-citations.md`; the emotion layer
in `docs/emotional-value-architecture.md`. This map is the architecture view.

---

## 1. Global chrome (present on every view)

| Component | Granular parts | Funnel stage | Research grounding | Value / KPI |
|---|---|---|---|---|
| `Header` | Logo → home, nav (4 links, scrollspy), account menu, cart button + live badge, mobile hamburger | Attention | Hick's Law (1952): decision time grows with option count — nav capped at 4 items. Nielsen's F-pattern (2006): brand mark top-left is the anchor of the reading pattern. | Orientation without thought; nav-to-section click-through |
| Nav scrollspy (`useScrollSpy`) | Document-order section tracking, active underline | Attention | "You are here" wayfinding reduces cognitive load (navigation research, NN/g); progress perception keeps users oriented during long scrolls. | Scroll depth, section engagement |
| Cart badge (`Header`) | Live item count on the bag icon | Commitment | Goal-gradient effect (Kivetz, Ur & Zheng 2006): visible progress toward a goal increases effort to complete it; the badge is the persistent progress cue. | Cart-to-checkout rate |
| `CartDrawer` | Line items, qty steppers, subscribe toggle, subtotal, checkout CTA, "view full cart" | Commitment | Baymard checkout research: every interruption between intent and checkout costs ~a percentage of buyers; the drawer keeps the funnel in-context (no page loss). Fitts's Law: checkout button is the largest, closest target. | Drawer→checkout conversion |
| `Toast` | Single transient feedback message | Post-purchase memory | Immediate system feedback confirms the action formed an intention (interaction-design heuristic, Nielsen's visibility-of-system-status). | Error-rate reduction (no double-adds) |
| `WhatsAppFloat` | Fixed bubble, prefilled greeting deep-link | Trust | Fogg Behavior Model (Stanford): a prompt works when motivation exists but ability is the barrier — chat removes the "write an email" ability cost. WhatsApp is the commerce-native channel for this market. | Support volume, assisted conversions |
| `Footer` | Brand block, Shop links, Policy & Info links (real pages, no `#` hrefs), Support/contact, socials, copyright | Trust | Stanford Web Credibility Project (Fogg 2002): ~46% of a site's credibility judgment is visual design; completeness signals (policies, physical address, FSSAI) are the substance behind it. Dead links destroy trust — every footer link resolves. | Bounce on scroll-to-footer, policy-page engagement |
| `FooterLinkGroup` | Generic group renderer, chevron-prefixed links | Trust | Consistent link treatment matches the mental model built on the brand's primary site (consistency heuristic); chevrons signal "navigation" not "content". | — |
| `PolicyView` + `policies.js` | Refund, Shipping, Privacy, Terms, FAQ (Radix Accordion) | Trust | Pre-purchase risk assessment is silent: Baymard finds return-policy doubts are a stated abandonment reason. FAQ-on-accordions: NN/g (Whitenton) — accordions respect mobile scanning by keeping dense answers collapsed until asked. | Refund-policy page views pre-checkout |
| `SignInModal` + magic-link auth | Email → link → session, zero password | Commitment | Baymard: forced account creation is a top-3 checkout abandonment reason. Passwordless login removes the entire credential-management cost (ability barrier, Fogg). | Auth completion rate, checkout abandonment delta |

---

## 2. Home funnel (the numbered story 01→05)

### 2.1 `Hero`
| Granular part | Funnel stage | Research grounding | Value |
|---|---|---|---|
| Headline + serif/sans type hierarchy | Attention | Lindgaard et al. (2006, *Behaviour & Information Technology*): visual appeal is judged in ~50 ms — before any reading happens. Typography is the largest contributor to that judgment. | Bounce rate |
| Single primary CTA + secondary | Attention | Hick's Law: one dominant action per screen; Fitts's Law: large, close target. | Hero CTA CTR |
| Sub-copy answering "why this oil" in one line | Attention | Value-proposition clarity above the fold (NN/g): users spend 57% of page-view time above the fold; the proposition must not require scrolling. | Scroll-through to 01 |

### 2.2 `CollectionSection` — "01 The Absolute Reserve"
| Granular part | Funnel stage | Research grounding | Value |
|---|---|---|---|
| Curated 5-product assortment | Value comprehension | Iyengar & Lepper (2000, Columbia): the famous jam study — 24 varieties drew more attention, 6 varieties sold **10× more**. Assortment curation is a conversion decision, not a catalog decision. | Selection→PDP rate |
| Category filter pills (All / seed / use-case) | Value comprehension | Paradox-of-choice mitigation: filters restore the 6-jam condition inside a larger inventory without adding nav complexity (Hick). | Filter usage → PDP rate |
| Product cards (image, name, size, price-incl-GST, rating only with real data) | Value comprehension | Price transparency (Baymard): hidden costs are the #1 stated abandonment reason — GST-inclusive price on the card removes the late-surprise cost. Spiegl Northwestern (2017): reviews lift conversion most on higher-priced goods, but a suspiciously perfect 5.0 reads as fake — ratings render only when real data exists. | Card→PDP CTR |
| User-controlled carousel (arrows + dots, no auto-advance) | Value comprehension | NN/g (Whitenton): auto-rotating carousels cause "banner blindness" and accidental content loss; user-controlled carousels preserve agency and comprehension. | Carousel reach per position |
| `QuickViewModal` (Radix Dialog) | Value comprehension | Dialog keeps context (no page loss); Radix Dialog handles focus trap + escape + scroll-lock — accessibility is conversion insurance, not decoration. | QuickView→add-to-cart |
| `AddToCart` (inline on card) | Commitment | Reduces the intent→action distance to one click (Fitts); drawer feedback confirms immediately (visibility of status). | Add-to-cart rate |

### 2.3 `Ticker`
| Granular part | Funnel stage | Research grounding | Value |
|---|---|---|---|
| Seamless marquee of proof points ("FSSAI", "lab-tested") | Trust | Serial repetition builds fluency (mere-exposure, Zajonc 1968); implemented as text content, not banner graphics, to avoid banner blindness (Benway & Lane 1998). | Brand-recall assist |

### 2.4 `ProcessSection` — "02 From Native Seeds"
| Granular part | Funnel stage | Research grounding | Value |
|---|---|---|---|
| 4 phase cards (01 Sourcing → 04 Bottling) with ambient video | Trust | Process transparency is provenance signaling — the cold-pressed claim is *shown*, not asserted (credibility: substance over claims, Stanford Web Credibility). Video: users process demonstrated process faster than described process (dual-coding, Paivio 1986). | Time-on-section |
| "Core Pillar" ribbon on the bull-press card | Trust | Cialdini authority/spotlight: marking the differentiating step directs attention to the reason-to-believe. | — |
| Cost/honesty footers per card ("<38°C", "zero micro-filters") | Trust | Specificity beats superlatives: concrete numbers are more credible than adjectives (NN/g trust research). | — |

### 2.5 `CreedSection`
| Granular part | Funnel stage | Research grounding | Value |
|---|---|---|---|
| Brand belief statement | Trust | Emotional narrative following the rational evidence (process) follows the persuasion sequence Cialdini documents: reasons before requests. | — |

### 2.6 `MatrixSection` — "03 Strict Transparency"
| Granular part | Funnel stage | Research grounding | Value |
|---|---|---|---|
| Comparison table (us vs. refined oils, across attributes) | Value comprehension | Anchoring (Tversky & Kahneman 1974): the refined-oil column sets the reference point that makes our attributes read as gains; loss framing (Kahneman & Tversky 1979) for what refined oil removes. | Comparison→collection scroll-back |
| `#product/<id>` deep links from matrix rows | Value comprehension | Every claim carries a path to the product that embodies it — claim→evidence adjacency. | Matrix-assisted PDP entries |

### 2.7 `SubscriptionSection` — "04 Seamless Agrarian Supply"
| Granular part | Funnel stage | Researchgrounding | Value |
|---|---|---|---|
| Kitchen Reserve explainer (honest: discount real today, scheduling coming) | Commitment | Reciprocity + commitment (Cialdini): the stated discount is real value exchanged now; honest disclosure of the roadmap converts skeptical readers instead of losing them later (expectation violation research). | Subscription toggle adoption |
| Default-off subscribe toggle everywhere | Commitment | Defaults ethics: opt-in preserves autonomy and avoids the backlash documented in opt-out dark-pattern research (also FTC posture). | Toggle→checkout carry-through |

### 2.8 `TestimonialsSection` — "05 What Makes People Come Back"
| Granular part | Funnel stage | Research grounding | Value |
|---|---|---|---|
| `TestimonialCard` + `StarRating` (real data only) | Trust | Social proof (Cialdini); Spiegel/Northwestern: authentic, imperfect reviews outperform manufactured perfection. | Section→PDP assists |

---

## 3. PDP (`ProductDetailView` + `components/pdp/`)

| Component | Funnel stage | Research grounding | Value |
|---|---|---|---|
| `Gallery` (Radix lightbox, thumbs) | Value comprehension | Product photos are the primary quality signal online (NN/g e-commerce research); zoom/lightbox answers the "examine the bottle" instinct that physical retail satisfies. | Gallery engagement→add |
| `UspChips` (bull-driven, cold-pressed, chemical-free) | Value comprehension | Chunking (Miller 1956): 3–4 badges are a memorable unit; more becomes noise. | — |
| `PriceBlock` (3 honest tiers + GST-inclusive) | Value comprehension | Anchoring via MRP; Baymard: total-cost transparency up front — GST shown before checkout removes the #1 abandonment trigger. | — |
| `VariantSelector` (Radix RadioGroup) | Commitment | Sensible default variant preselected (choice-architecture defaults, Thaler & Sunstein); radio semantics give keyboard/screen-reader users the same clarity (a11y = conversion). | Variant switch rate |
| `QuantityStepper` | Commitment | Steppers beat dropdowns for small ranges (fewer gestures, Fitts). | — |
| `SubscribeSaveRow` (10% real, applies at checkout) | Commitment | Loss framing done honestly: "you save" vs. "you lose the discount" — same math, tested direction (Kahneman-Tversky); real math verified end-to-end (sub 398 → −39.80). | Subscription attach rate |
| `StickyATCBar` (mobile, IntersectionObserver) | Commitment | Fitts's Law on mobile: the buy action stays in the thumb zone without covering content until the main button scrolls away; `useOnScreen` prevents redundancy. | Mobile ATC rate |
| Facts panel (Perfect For / Ingredients / Storage / Best Before) | Trust | Vocabulary matched to the physical bottle labels — site↔package consistency is credibility glue (Stanford Web Credibility: site must match the real-world entity). | — |
| `productStory` + `nutritionTable` | Trust | Scroll-revealed depth: the fold is not a wall (Nielsen: users scroll when the above-fold content promises value). | Depth of read |
| `FaqSection` (Radix Accordion) | Trust | Whitenton (NN/g): accordions fit mobile scanning — answers collapsed until asked; objections answered on-page prevent silent exits. | FAQ opens→add |
| `ComparisonTable` | Value comprehension | Same anchoring role as the home matrix, at the decision point where it matters most. | — |
| Buy Now (skip cart) | Commitment | Two commitment speeds: accumulate-then-buy vs. straight-to-checkout serves different intent levels (checkout-behavior segmentation, Baymard). | Buy-Now share |

---

## 4. Cart → Checkout → Post-purchase

| Component | Granular parts | Funnel stage | Research grounding | Value |
|---|---|---|---|---|
| `CartView` | Line review, qty, subscribe state, savings display | Commitment | Review step reduces post-purchase dissonance (cognitive-dissonance, Festinger 1957); showing the subscription saving *in the cart* makes the discount tangible before payment. | Cart→checkout rate |
| `CheckoutView` | Address prefill (from account), contact, order summary, GST/discount breakdown | Commitment | Baymard: form length and forced data-entry are abandonment drivers — prefill (magic-link account) converts repeat buyers to a 3-field flow. | Checkout completion |
| Order confirmation + claim card | Order code, summary, savings, next steps | Post-purchase memory | Peak-end rule (Kahneman et al. 1993): the *end* of the experience disproportionately shapes the remembered evaluation — a calm, information-rich confirmation manufactures the remembered peak. | Support tickets ("where is my order") |
| `TrackOrder` | Code + email → status | Post-purchase memory | Anxiety reduction is retention work: self-service tracking deflects the highest-volume support query (Baymard post-purchase studies). | Repeat-purchase rate |
| Account (`AccountView`) | Profile, orders, one-click reorder, loyalty, address | Return | Commitment & consistency (Cialdini): stored history + reorder lowers repeat-purchase effort below the competition's switch cost. | Reorder rate |
| Loyalty surfacing | Points/balance in account + checkout | Return | Goal-gradient again: a visible points balance is an unfinished goal pulling the next visit (Kivetz). | Return frequency |

---

## 5. Architecture-level decisions as UX components

| Decision | Research grounding |
|---|---|
| Hash-based views (`#cart`, `#product/<id>`, `#policy/<key>`) | Linkable, back-button-true destinations match the web's mental model (users share links; state URLs are recoverable). |
| `ContentContext` static fallback keeps buy buttons alive during API outage | Availability under degradation — an empty shop during a backend blip is a zero-conversion event; resilience is a revenue feature. |
| No fake countdowns / invented offers | Scarcity works but fabricated urgency is a dark pattern with measurable backlash (and regulatory exposure); long-term trust > short-term click. |
| Lazy-loading for heavy experiences | Google/SOASTA mobile research: majority of mobile users abandon past ~3s load — the page must earn the right to load more. |
| Full accessibility on interactive primitives (Radix) | Disabled and keyboard users are buyers too; plus a11y practices (focus order, labels) correlate with overall usability quality. |

---

## 6. Value roll-up — where the money actually is

1. **Trust layer** (footer, policies, process, testimonials): protects the silent
   pre-purchase risk assessment. Failure mode: silent exit, never diagnosed.
2. **Price transparency layer** (GST-inclusive cards, cart math, honest tiers):
   attacks Baymard's #1 stated abandonment reason directly.
3. **Friction layer** (magic-link auth, prefill, sticky ATC, drawer): converts
   existing intent instead of manufacturing new demand — cheapest gains.
4. **Memory layer** (confirmation, tracking, loyalty): manufactures the
   remembered peak and pulls the next visit (peak-end + goal-gradient).
5. **Curated-choice layer** (5-product reserve, filters, defaults): the
   Iyengar-Lepper lever — attention is bought by the hero, but conversion is
   won at the shelf.

## 7. Honest gaps (research-backed priority order)

1. **Reviews backend** — Spiegel/Northwestern shows the largest single-conversion
   lift available to this storefront today; the UI already renders real data.
2. **Free-shipping progress indicator** — goal-gradient applied at the cart.
3. **Search** — becomes critical the moment the catalog exceeds one screen
   of curated choice (Hick's Law returns with inventory growth).
4. **Post-purchase review request flow** — feeds component #1.
