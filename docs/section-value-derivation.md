# Section Value Derivation — every page, every component

A belief-stripping audit. For each component: **where the pattern actually comes
from** (a real, inspectable website or a published study — not UX folklore),
**the mechanism** (what human system it engages), **how value is currently
extracted**, and **the unexploited remainder** (the gap between installed
potential and peak potential).

Ground rules used throughout:

- No claim without a source. Where only practitioner/blog evidence exists, it
  is labeled **[practitioner]** — directionally consistent with peer-reviewed
  findings but not itself peer-reviewed. Treat as hypotheses to A/B, not facts.
- "Peak potential" means: given this component's mechanism, what is the
  maximum business value the evidence says it can carry, and how far the
  current build is from it.
- Value is stated as a funnel job: Attention → Trust → Value → Commitment →
  Post-purchase → Return (per `storefront-component-map.md`).

Verified research citations are numbered #1–#34 and refer to
`citations-verified.md`. New sources found for this audit are cited inline.

---

## HOME PAGE (`view === 'home'`) — the funnel in section order

### 1. Header (`src/components/Header.jsx`)

- **Origin.** Persistent navigation with cart/account/track-order actions is
  the universal e-commerce chrome pattern (Amazon, Anveshan, feldnstein.com
  all converge on it). NN/g navigation research: users rely on a small number
  of persistent anchors; F-pattern scanning makes the top strip the most
  reliably seen real estate on any page (#28).
- **Mechanism.** System-status visibility (Nielsen heuristic #1, #31): cart
  count and signed-in state answer "where am I, what have I got" without a
  click. Fitts's law (#20): header actions sit in the top thumb-reach zone on
  mobile.
- **Currently extracting:** logo→hero reset, section anchors, live cart count,
  track-order entry, Telugu/English toggle (ADR-0029 — the single largest
  documented alignment lever per §D.3 of citations-verified), sign-in modal
  instead of a forced page (Baymard: forced account creation is a top-3
  abandonment driver, #34).
- **Unexploited remainder:** the scroll-spy nav is decoration on a 1-page
  store; its job is better done by the scroll cue and section labels. The
  language toggle is chrome-level only — section *body* copy is still
  English-only; §D.3 of citations-verified calls vernacular body copy the
  largest untapped lever, currently ~10% exploited.

### 2. Hero (`src/components/Hero.jsx`)

- **Origin.** Above-the-fold hero with a single message and a primary CTA is
  the standard pattern every high-converting store converges on; practitioner
  analysis puts hero visibility at 100% of visitors vs 60–75% for products
  sections ([Shopidevs homepage anatomy, 2026][shopidevs] — **[practitioner]**,
  consistent with F-pattern #28). The "one glance chip row + two CTAs" shape
  mirrors premium D2C food heroes (Anveshan product/brand pages).
- **Mechanism.** 50-ms first-impression judgment (#2) decides whether the
  reels-trained 1–2 s attention budget (§D.1) is spent here or swiped away.
  Affect-before-cognition (#12): the moving ambient footage and warm palette do
  emotional work the copy never could. Dual coding (#17): moving image of the
  real mill is worth paragraphs of process description. Mere exposure (#11):
  the brandmark-in-hero repetition builds fluency across visits.
- **Currently extracting:** real-mill ambient video (with the "real footage,
  no AI" caption — §D.4 counter-positioning), kinetic headline for
  glance-readable meaning, three glance chips (cold-pressed / bull-driven /
  batch-traceable), primary+secondary CTA, scroll cue, reduced-motion guard.
- **Unexploited remainder:** no offer/shipping line above the fold. Practitioner
  CRO literature consistently ranks a single specific line ("free delivery over
  ₹X" / "pressed this week") among the cheapest hero-value adds
  ([announcement-bar analyses][revflows] — **[practitioner]**; consistent with
  extra-costs being the #1 stated abandonment reason, #27). Also: the kinetic
  headline is English-only — in Telugu mode the highest-value real estate on
  the site stays English.

### 3. CollectionSection (`src/components/CollectionSection.jsx`)

- **Origin.** The homepage product grid is the "Featured Products/Bestsellers"
  slot in the standard converting-homepage anatomy
  ([Shopidevs][shopidevs] — **[practitioner]**, order matches Amazon/Anveshan
  homepages). Quick-view modals are the Baymard-endorsed pattern for inspecting
  a product without losing grid scroll position.
- **Mechanism.** The 5-oil curated grid is a deliberate application of the
  choice-paradox finding (#1: 6 varieties outsold 24 by 10×) — curation is the
  value, not breadth. Hick's law (#19): five cards keep choice latency near
  minimum. AddToCart on the card compresses the path from intent to commitment
  (every removed step recovers a slice of the ~70% abandonment base rate, #27).
- **Currently extracting:** curated 5-card grid, per-card AddToCart,
  QuickViewModal for inspection, assetUrl imagery.
- **Unexploited remainder:** cards don't carry social proof (rating/count) or
  scarcity ("batch of 214 bottles — 31 left"). Spiegel (#7) says reviews lift
  conversion most on higher-priced goods, and the grid is where price
  comparison first happens. ReviewsSection exists on the PDP but the grid
  doesn't surface its summary — a one-line rating row on each card is the
  cheapest conversion transfer on the page.

### 4. Ticker (`src/components/Ticker.jsx`)

- **Origin.** Marquee/announcement strips descend from retail window signage;
  in e-commerce they are the "announcement bar" slot. Practitioner consensus:
  they earn their place only when carrying one specific, valuable message —
  shipping thresholds being the most reliable ([EasyApps AOTF guide][easyapps];
  [RevenueFlows][revflows] — **[practitioner]**).
- **Mechanism.** Mere exposure (#11) — a slow-moving repeated strip is sub-lexical
  brand/value reinforcement. Banner blindness (#32) is the tax: if it looks
  like an ad, it is skipped.
- **Currently extracting:** process-value claims ("no heat, no refining…") in
  brand voice — reads as brand creed, not promotion, which is the correct
  defense against banner blindness.
- **Unexploited remainder:** pure brand copy has no transaction value. The
  evidence-based upgrade is rotating one *operational* truth through the same
  mechanism — e.g. "Batch #214 pressed Tue · ships in 48h" from the live
  backend (V23 released-batch endpoint already exists). Same exposure
  mechanism, but now each pass also carries scarcity and freshness proof.

### 5. ProcessSection (`src/components/ProcessSection.jsx`)

- **Origin.** "How it's made" brand-story sections are the standard
  post-grid trust slot ([Shopidevs anatomy][shopidevs]: "Brand Story /
  Value Proposition" sits exactly here). Anveshan, Two Brothers, and every
  premium Indian food D2C run a version of it.
- **Mechanism.** Authenticity is inferred from indexical cues — traces of
  origin and craft (#6). Dual coding (#17): showing the bull-driven press
  beats describing it. Nostalgia/self-continuity (#4, #5): the Gaanuga method
  connects the buyer to their grandmother's kitchen — the emotional core of
  the entire brand, per `emotional-value-architecture.md`.
- **Currently extracting:** ambient mill footage (real, captioned no-AI),
  step narrative, numbered section label (01–05 sequence).
- **Unexploited remainder:** the section tells the process generically; it
  doesn't show *this week's* pressing. A live "last pressed" line from the
  same V23 endpoint would convert static heritage into present-tense proof —
  the difference between a museum and a working mill.

### 6. CreedSection (`src/components/CreedSection.jsx`)

- **Origin.** Values-manifesto sections are a premium/D2C pattern (Anveshan's
  brand page, Patagonia's activism copy) with no direct mass-market analogue.
- **Mechanism.** Moral identity (#15) and care/harm (#14): the buyer who sees
  themselves as a protector of family health acts on that identity. Warm glow
  (#26): the purchase as a small moral act. Conspicuous conservation (#22):
  "I buy properly-made oil" is a pro-social status signal.
- **Currently extracting:** the brand's non-negotiables in first person.
- **Unexploited remainder:** a creed is a claim; the evidence base (#3, #6)
  says claims need indexical backing. Every creed line should be one click
  from its proof (batch → farmer → press record). Currently the creed asserts;
  the PDP fact cards prove; the two aren't linked.

### 7. MatrixSection (`src/components/MatrixSection.jsx` + `MobileComparisonCarousel`)

- **Origin.** Comparison matrices are endemic to considered-purchase
  categories (mattresses, insurance, supplements); in food D2C, Anveshan uses
  "cold-pressed vs refined" explainer tables. Cross-sell/upsell panels as
  AOV levers are among the most-documented practitioner plays
  ([Baymard on cart cross-sell relevance][baymard-xsell] — relevance is the
  whole game; unrelated suggestions actively hurt).
- **Mechanism.** Hick's law (#19): the matrix replaces "which of 5?" with a
  decision procedure. Prospect-theory anchoring (#8): "refined oil at ₹/L"
  re-anchors what "expensive" means before the price is judged. Choice
  architecture (#25): a well-built default row steers without restricting.
- **Currently extracting:** whole-catalog comparison with a mobile carousel
  fallback (correct — tables fail on 360px screens, ~70–75% of Indian traffic
  is mobile per StatCounter, §C).
- **Unexploited remainder:** the matrix compares oils against *each other* but
  not against the *alternative* (refined/mustard-seed oil the household
  already buys). The anchoring move (#8) against the buyer's incumbent choice
  is the higher-value derivation; against our own catalog it risks choice
  paralysis (#1) — five oils all described beautifully is five ways to defer.

### 8. SubscriptionSection (`src/components/SubscriptionSection.jsx`)

- **Origin.** Amazon Subscribe & Save is the canonical derivation of
  subscription economics at scale (5% base / 15% at 5+ items — the discount
  ladder we mirror on the PDP row); Similarweb measured Subscribe & Save
  groceries at **20+ percentage points higher subscription rates** than
  non-grocery categories ([Similarweb, 2021][similarweb-sns]). Practitioner
  retention benchmarks: subscription customers carry materially higher LTV
  (4.1× LTV / 45% 12-month retention figures circulate widely — **[practitioner]**,
  e.g. [launchmystore 2025][launchmystore]; treat as directional).
- **Mechanism.** Commitment/consistency + reciprocity (#23): the subscriber
  identity, once taken, self-perpetuates. Defaults (#25): pre-selected
  subscribe option steers without restricting. Loss framing (#8): "never run
  out" is loss-avoidance, stronger than the equivalent gain.
- **Currently extracting:** Kitchen Reserve / Subscribe & Save section wired to
  the live shopApi, and the Radix-Switch subscribe toggle on the PDP
  (SubscribeSaveRow) — both committed and functional.
- **Unexploited remainder:** the PDP switch exists but has no incentive
  differential stated next to it (S&S's 5%/15% ladder is the persuasion; ours
  says "save" without quantifying). First-90-day churn is the documented
  killer (10–15%/month, [EasyApps 2026 benchmarks][easyapps-sub] —
  **[practitioner]**); a "skip or change anytime" microcopy line at the toggle
  addresses exactly that risk and costs nothing.

### 9. TestimonialsSection (`src/components/TestimonialsSection.jsx`)

- **Origin.** Homepage social-proof bands are the "Social Proof" slot in the
  standard homepage anatomy ([Shopidevs][shopidevs]: 50–65% of visitors reach
  it — the last section that still carries funnel weight).
- **Mechanism.** Social proof under low elaboration (#18): for a low-involvement
  staple, "people like me buy this" is a legitimate peripheral cue. The 4.0–4.7
  credibility band (#7): imperfect ratings outperform perfect ones.
- **Currently extracting:** curated testimonial cards with star ratings.
- **Unexploited remainder:** curated testimonials are the weakest social-proof
  form — the buyer knows they're selected (AI-content skepticism, §D.4, makes
  polished testimonial cards *less* credible than plain ones). The backend now
  has moderated reviews (ADR-0028); pulling 3–4 real, typo-tolerant,
  first-name reviews from the same Postgres that feeds the PDP would make this
  section verifiably real — cross-platform trust (§D.5) demands the homepage
  proof match what Google reviews say.

### 10. Footer (`src/components/footer/*`)

- **Origin.** Four-column footer (brand / links / policy / contact) matches
  feldnstein.com's own footer, which the client supplied as the reference —
  Shop links, About/Process/FAQ, Return & Refund / Shipping / Privacy / Terms,
  phone + email + address, socials, copyright line. This is also the dominant
  e-commerce footer grammar.
- **Mechanism.** The footer is the trust terminus: policy links convert
  pre-purchase anxiety (return/refund uncertainty is a documented checkout
  blocker category, #27) at the moment of maximum skepticism. Contact
  visibility is a credibility heuristic (#3). The Find-us row (Instagram ·
  YouTube · Google) operationalizes §D.5: the site deliberately routes the
  buyer to the exact places they will check anyway.
- **Currently extracting:** real policy pages (`#policy/<key>` via Radix
  Accordion, mobile-correct per #30), support channels incl. WhatsApp (500M
  Indian users, §C), no-AI line, sound preference, © bar.
- **Unexploited remainder:** policies exist but aren't linked from the PDP or
  checkout at the anxiety moment — a "Returns & shipping" one-liner beside the
  PDP Add to Cart would move the policy terminus to where the risk is felt.

### 11. Persistent chrome: CartDrawer, Toast, WhatsAppFloat, BackToTop, sound, scroll cue

- **CartDrawer** — drawer (not page) cart keeps context; system-status feedback
  (#31) on every add. Baymard grocery research: ATC buttons that become
  quantity steppers are the efficient grocery pattern ([Baymard, 2023][baymard-grocery]);
  the drawer + toast approximates it.
- **Toast** — confirmation feedback (#31); peak-end (#10) contributes the "end"
  of the add-to-cart micro-experience.
- **WhatsAppFloat** — India's customer-service layer (§C, >500M users); the
  float is the D2C-standard derivation (every Indian D2C store runs one).
  Playbook's proactive order-status updates via WhatsApp are the unbuilt peak.
- **BackToTop** (bottom-left, deliberate) — Fitts (#20) + thumb-zone; avoids
  colliding with the WhatsApp float bottom-right.
- **Sound feedback** (gesture-gated, mutable) — sensory commitment marker;
  small, honest, off by default until user gesture (ADR-0027).
- **Scroll cue** — attention handoff from hero to grid; practitioner pages put
  scroll-depth as a core homepage metric **[practitioner]**.

---

## PRODUCT DETAIL PAGE (`ProductDetailView.jsx`) — the minute-segment PDP (ADR-0025)

The PDP is the page where research density is highest; segment order follows
the Amazon-mobile PDP grammar the client supplied, adapted to premium food.

| # | Segment | Origin | Mechanism | Extracted now | Peak-derivation gap |
|---|---------|--------|-----------|---------------|---------------------|
| 1 | Gallery + Radix lightbox | Amazon/Anveshan PDP galleries | Inspection reduces imagination-gap risk (#18 peripheral → central switch) | Image set, Dialog lightbox | No scale/usage context shot; no video tab of the actual mill |
| 2 | Name + share + StarRating | Universal PDP grammar | Social proof at decision point (#7) | Live rating via reviews backend | Rating count hidden until reviews section; move summary here |
| 3 | UspChips | Anveshan USP strip | Peripheral cue bundle (#18) | 3–4 claim chips | Not linked to proof (same as Creed gap) |
| 4 | PriceBlock incl. per-day cost | Amazon "($2.74/count)" unit pricing; playbook E7 | Anchoring/reframing (#8): ₹X/L → ₹Y/day defeats discount culture | Live price, per-day line | Per-day denominator (42 days) is asserted, not personalized to household size |
| 5 | SubscribeSaveRow (Radix Switch) | Amazon S&S toggle (client screenshot) | Defaults (#25), loss framing (#8) | Functional toggle | No stated % incentive; no "skip anytime" churn-killer microcopy |
| 6 | VariantSelector (Radix RadioGroup) | Amazon variant swatches | Hick (#19): 3 sizes chunked as visual choice | 250/500/1000ml radio | No per-variant per-day price comparison |
| 7 | QuantityStepper + ATC / Buy Now | Universal; Baymard grocery stepper | Fitts (#20); commitment ladder (#23) | Both CTAs, stepper | ATC→stepper transition (Baymard grocery pattern) unbuilt |
| 8 | Fact cards: Perfect For / Good to Know + **batch genealogy FactRow** | Bottle right-label (client asset) + playbook E7 | Indexical authenticity (#6): farmer→bull→press→batch | Live `/shop/products/{id}/batch` (V23) | Genealogy stops at batch code; farmer name/story is the emotional peak and isn't rendered |
| 9 | Nutrition table | Bottle label (FSSAI) | Risk reversal via regulatory familiarity | Full table | — (label parity is the job; done) |
| 10 | Trust badges | Amazon PDP badge row | Peripheral trust (#18, #3) | Inline row | Generic icons, not specifics (FSSAI lic. no., lab report link) |
| 11 | ReviewsSection (ADR-0028) | Amazon reviews | #7: up to ~270% conversion lift, 4.0–4.7 band most credible | Real moderated reviews, public GET | Review-request post-purchase flow unbuilt → supply will starve |
| 12 | FaqSection (Radix Accordion) | Amazon "Ask a question"/FAQ | Mobile scanning (#30); objection clearing at point of doubt | Real FAQ accordion | Not populated from actual asked questions yet |
| 13 | ComparisonTable (whole catalog) | Anveshan cross-sell | AOV cross-sell ([Baymard][baymard-xsell]: relevance is everything) | Per-product cross-sell | Shows all 5 oils incl. cheaper ones — risk of downward anchor (#8) without a "why this one wins" row |
| 14 | StickyATCBar | Mobile-Amazon grammar; ubiquitous **[practitioner]** CRO baseline | Fitts (#20); survives scroll; recovers mobile commitment | Mounted with useOnScreen gating | Correctly built; cheapest highest-confidence mobile component on the page |

---

## TRANSACTIONAL PAGES

### Cart (`CartView.tsx`)
- **Origin/mechanism.** Cart is where the #27 bill comes due: 70.22% average
  abandonment, extra costs the #1 stated reason (48%), checkout length ~22%,
  forced accounts ~24%. Price transparency *in* the cart is the defense.
- **Extracted:** line items with images, order summary.
- **Gap:** no free-shipping threshold bar — the single most-cited
  **[practitioner]** cart upgrade (threshold progress converts "shipping shock"
  into "one more item"); no cross-sell of the *complement* oil at the cart
  ([Baymard][baymard-xsell] — relevance rules; groundnut+sesame is a real
  kitchen complement, not a random widget).

### Checkout (`CheckoutView.tsx`)
- **Origin/mechanism.** Baymard's checkout research program (59% of leading
  sites rate mediocre-or-worse, [2024][baymard-checkout]) is the canon:
  minimal fields, no forced account (#34), order review before commit,
  confirmation as peak-end "end" (#10).
- **Extracted:** single-page form + summary, order-confirmation state with
  test-id, no forced account creation (guest flow implicit).
- **Gap:** no UPI-intent deep link — UPI is ~49% of world real-time payment
  volume (§C) and every extra payment step is pure loss (§D verdict); no
  delivery-date estimate (date certainty is a documented anxiety-killer
  **[practitioner]**, consistent with #31).

### Account (`AccountView.tsx`)
- **Origin/mechanism.** Order history = post-purchase trust repair (cognitive
  dissonance reduction, #16) and the reorder entry point (return funnel).
- **Extracted:** signed-out state, My Orders via authApi.
- **Gap:** no reorder one-tap (the staple repurchase is the business model —
  the subscription section exists precisely because of this); no loyalty
  balance surfacing beyond TrackOrder.

### TrackOrder (`TrackOrder.tsx`)
- **Origin/mechanism.** Order tracking is heuristic #1 (system status, #31)
  applied post-purchase; reduces WISMO ("where is my order") support load —
  the highest-volume e-commerce support category **[practitioner]**.
- **Extracted:** order-code lookup, order details + loyalty balance.
- **Gap:** the playbook's proactive WhatsApp status push (the buyer shouldn't
  have to look) is unbuilt.

### Policy pages (`PolicyView.tsx` + `policies.js`)
- **Origin/mechanism.** Radix Accordion policies (#30 mobile-correct); content
  mirrors the feldnstein.com policy set the client specified (Return & Refund,
  Shipping, Privacy, Terms, FAQs).
- **Extracted:** real, navigable, footer-linked pages.
- **Gap:** none structural; keep content synced with actual ops policy.

---

## DEAD CODE — value withdrawn by decision

`src/components/tour/` (MillSplatViewer + Tour3DSection, three@0.187.0) was
built, verified rendering, then deliberately unmounted at user request. The
Gaussian-splat mill tour remains the strongest *unexploited* sensory asset on
the disk (10MB `.ply`, verified). Re-mounting decision is the owner's, not the
site's; documented so the asset isn't accidentally deleted as dead code.

---

## The pattern underneath all of it

Every section above derives from one of three sources:

1. **Convergent evolution** — Amazon/Anveshan/feldnstein.com independently
   landed on the same grammar (header chrome, PDP segment order, footer
   columns) because they optimize the same human under the same constraints.
   Where we match them, we inherit the optimization.
2. **Published human-systems research** — the #1–#34 ledger. Where a section
   deviates (curated 5-oil grid vs. infinite catalog), it's a *deliberate*
   bet on a documented effect (#1), not taste.
3. **Client-supplied brand truth** — the bottle labels, the feldnstein.com
   footer, the Amazon screenshot grammar. These are constraints, not choices.

Beliefs stripped in this audit: "carousels work" (#29 — ours is manual-only),
"more choice = more sales" (#1 inverted), "perfect 5.0 looks good" (#7 — it
reads fake), "polished AI imagery impresses" (§D.4 — it now repels),
"sound on entry is delightful" (ADR-0027 — gesture-gated only), "testimonials
build trust" (weakest form; backend-fed reviews are the strong form).

## Where the remaining peak value lived (ranked) — now BUILT

All seven moves below shipped on 2026-11-25 (ADR-0030, backend V24). They are
kept here as the record of what the audit found and what each move was
expected to move; the ADR-0030 table carries the per-move impact hypotheses
and measurement instruments.

1. **Grid cards + PDP header showing real rating counts** — transfers the
   built reviews backend (ADR-0028) to the two highest-attention surfaces. (#7)
2. **Quantified subscription incentive + "skip anytime" microcopy** — the S&S
   persuasion mechanism is the discount ladder; ours is unquantified.
   ([Similarweb][similarweb-sns])
3. **UPI-intent checkout link** — removes steps from the payment reflex of the
   market. (§C)
4. **Cart free-shipping threshold bar + complement cross-sell** — attacks the
   #1 stated abandonment reason at its exact location. (#27, [Baymard][baymard-xsell])
5. **Vernacular body copy** — chrome-level Telugu is shipped; the §D.3 verdict
   says body copy is the larger half of the lever.
6. **Review-request post-purchase flow** — without supply, the #7 mechanism
   starves within a quarter.
7. **Batch genealogy → farmer name/story** — the batch endpoint is live; the
   emotional peak of #6 (indexical authenticity) is one render away.

### Regression found and fixed while building move 1

`GET /shop/products/{id}/reviews` had been 404ing since the V23
`ShopCatalogResource` landed: a class-level `@Path("/shop/products")` root
silently shadows two-deep method paths registered from a sibling
`@Path("/shop")` class. The frontend's catch-and-hide masked it. Fixed by
moving the read side onto `ShopCatalogResource` (see its javadoc). Lesson
added to the routing doctrine: deep paths belong under the class-level root
that owns their prefix.

[shopidevs]: https://shopidevs.com/shopify-homepage-layout/
[easyapps]: https://easyappsecom.com/guides/shopify-above-the-fold-optimization.html
[revflows]: https://revenueflows.ai/blog/do-announcement-bars-increase-shopify-conversion-rate
[similarweb-sns]: https://www.similarweb.com/blog/ecommerce/amazon-insights/subscribe-save/
[launchmystore]: https://launchmystore.io/blog/customer-retention-strategies-for-online-stores
[easyapps-sub]: https://easyappsecom.com/guides/shopify-subscription-ecommerce-statistics-2026.html
[baymard-xsell]: https://baymard.com/research-articles/product-recommendations-cart
[baymard-grocery]: https://baymard.com/research-articles/grocery-add-to-cart-buttons
[baymard-checkout]: https://baymard.com/research-articles/current-state-of-checkout-ux
