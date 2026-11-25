# Component Citations — every piece, its psychology, behavior, business value, intent

The per-piece justification ledger. Each component states: the **citation**
(research grounding), the **user psychology** it engages, the **user
behavior** it shapes, the **business value** it protects or creates, and the
**intent conveyed** to the visitor. Companion to
`docs/storefront-component-map.md` (architecture) and
`docs/emotional-value-architecture.md` (emotion layer).

---

## Global chrome

### Header (logo, 4-link nav, account, cart badge, hamburger)
- **Citation**: Hick's Law (Hick, 1952); Nielsen's F-pattern eye-tracking
  studies (NN/g, 2006); Baymard Institute navigation research.
- **Psychology**: decision fatigue rises with option count; the top-left
  anchor matches the learned reading pattern; a live cart count is a
  progress cue (goal-gradient, Kivetz et al. 2006).
- **Behavior**: visitors orient within seconds and self-select a path
  without conscious effort; the badge keeps the cart mentally "open".
- **Business value**: orientation speed → lower bounce; badge → higher
  cart-return rate.
- **Intent conveyed**: "You are in a shop that knows where everything is."

### Nav scrollspy (`useScrollSpy`)
- **Citation**: "You are here" wayfinding research (NN/g); progress
  perception in long pages (Nielsen scroll studies).
- **Psychology**: reduces the anxiety of being lost inside a long scroll;
  the underline is a promise kept.
- **Behavior**: deeper scrolling with fewer drop-offs at section
  boundaries.
- **Business value**: scroll depth directly correlates with section
  exposure (all numbered sections below depend on it).
- **Intent conveyed**: "The page has a shape, and you are moving through it
  with us."

### CartDrawer (lines, steppers, subscribe toggle, subtotal, checkout CTA)
- **Citation**: Baymard checkout-interruption research; Fitts's Law
  (Fitts, 1954).
- **Psychology**: keeping the funnel in context respects the visitor's
  mental model of "a quick check"; the large checkout target rewards the
  formed intention immediately.
- **Behavior**: review-and-continue without page loss; fewer abandoned
  sessions at the cart stage.
- **Business value**: drawer→checkout conversion; measurable against the
  ~70% industry cart-abandonment baseline (Baymard).
- **Intent conveyed**: "Your reserve is safe; one more step and it's yours."

### Toast
- **Citation**: Visibility of system status, Nielsen's #1 heuristic;
  immediate-feedback principle (Norman, *The Design of Everyday Things*).
- **Psychology**: unconfirmed actions create doubt; doubt creates repeat
  clicks and hesitation.
- **Behavior**: prevents double-adds and re-clicks.
- **Business value**: cleaner cart data; fewer accidental multi-quantity
  orders and their support cost.
- **Intent conveyed**: "We heard your click. It worked."

### WhatsAppFloat
- **Citation**: Fogg Behavior Model (Stanford, B.J. Fogg); channel-norm
  research for Indian D2C commerce.
- **Psychology**: motivation is high at the moment of doubt, but ability
  (writing an email, making a call) is the barrier; WhatsApp removes it.
- **Behavior**: turns silent exits into conversations — hesitation becomes
  a question, and a question handled is a sale saved.
- **Business value**: assisted-conversion rate; support deflection.
- **Intent conveyed**: "A human is one tap away. We are not hiding."

### Footer (brand, Shop, Policy & Info with real pages, Support, socials)
- **Citation**: Stanford Web Credibility Project (Fogg et al. 2002):
  ~46% of credibility judgment from design, but substance (policies,
  address, licenses) is what the design certifies.
- **Psychology**: pre-purchase risk assessment is silent; completeness of
  the footer is read as completeness of the company.
- **Behavior**: the footer is the second-most-visited trust surface after
  the product page; dead links end sessions.
- **Business value**: every footer link resolving is a conversion risk
  removed; policy engagement precedes high-AOV orders.
- **Intent conveyed**: "This company exists, stands behind its oil, and
  will still be here next month."

### Policy pages + FAQ accordion (`PolicyView`)
- **Citation**: Baymard (return-policy doubt is a stated abandonment
  reason); Whitenton (NN/g) on accordions for mobile scanning.
- **Psychology**: risk reversal (the guarantee transfers the fear from the
  buyer to the seller); collapsed answers respect that no one reads
  legalese until it matters — then it must be findable.
- **Business value**: fewer pre-checkout exits; fewer "what if" support
  tickets.
- **Intent conveyed**: "If anything is wrong, we fix it. In writing."

### SignInModal + magic-link auth
- **Citation**: Baymard: forced account creation is a top-3 checkout
  abandonment reason; passwordless UX research (FIDO Alliance).
- **Psychology**: passwords are ability-barriers and anxiety objects;
  removing them removes a whole failure category.
- **Behavior**: sign-in happens when the user chooses, not when the flow
  demands; repeat checkout becomes pre-filled checkout.
- **Business value**: auth completion rate; repeat-order velocity.
- **Intent conveyed**: "Your account is yours — no password to forget,
  nothing to manage."

---

## Home funnel

### Hero (headline, sub, gold CTA + shine, ghost CTA, scroll cue, ambient video)
- **Citation**: Lindgaard et al. (2006, *Behaviour & Information
  Technology*): aesthetic judgment in ~50 ms; Nielsen above-the-fold
  attention distribution; NN/g on explicit scroll affordances; Zajonc
  (1980) affective primacy.
- **Psychology**: the hero is felt before read — gold-on-forest light
  language speaks "oil, warmth, earth"; the shine sweep is a gentle
  attention magnet (peripheral vision is motion-sensitive); the scroll cue
  converts "is there more?" into "yes, and it's promised."
- **Behavior**: single dominant CTA (Hick), immediate downward scroll
  initiated by the cue rather than abandoned at the fold.
- **Business value**: hero CTR and scroll-past-hero rate gate every
  downstream metric.
- **Intent conveyed**: "Slow, golden, real — and there is more below."

### CollectionSection "01 — The Absolute Reserve"
- **Citation**: Iyengar & Lepper (2000, Columbia) — the jam study: 6
  options outsold 24 by 10×; NN/g (Whitenton) on user-controlled
  carousels; Baymard on price transparency; Spiegel Research Center
  (Northwestern, 2017) on reviews.
- **Psychology**: curation is care — five oils reads as "chosen", not
  "limited"; GST-inclusive pricing removes the late-surprise cost
  (contamination-of-trust effect); ratings appear only when real because
  manufactured perfection reads as fake (Spiegel: ~4.2–4.7 is the
  credible band).
- **Behavior**: filters narrow without overwhelming; users drive the
  carousel, so they see what they chose to see (agency → recall).
- **Business value**: card→PDP rate is the top of the conversion pipe;
  price transparency attacks the #1 stated abandonment reason.
- **Intent conveyed**: "Five oils, each chosen. Nothing hidden in the
  price."

### Ticker
- **Citation**: Mere-exposure effect (Zajonc 1968); banner blindness
  (Benway & Lane 1998).
- **Psychology**: fluency through repetition — the proof points stop
  being read and start being known.
- **Behavior**: implemented as text, not banner graphics, so it escapes
  blindness.
- **Business value**: brand-recall assist that costs no layout space.
- **Intent conveyed**: "Lab-tested, certified, small-batch" — as rhythm,
  not claim.

### ProcessSection "02 — From Native Seeds"
- **Citation**: Dual-coding theory (Paivio 1986); Stanford Web
  Credibility (substance over claims); NN/g: specificity beats
  superlatives.
- **Psychology**: seeing the press is believing — demonstrated process is
  proof; "<38°C", "3 RPM" are felt as honesty (numbers are emotional
  objects).
- **Business value**: time-on-section predicts PDP entry quality; the
  "Core Pillar" ribbon focuses the differentiator.
- **Intent conveyed**: "We show you exactly how your oil is born."

### CreedSection
- **Psychology**: after reasons, the emotional request (Cialdini's
  sequence): beliefs make buyers feel the brand stands for something.
- **Intent conveyed**: "This is why we exist."

### MatrixSection "03 — Strict Transparency"
- **Citation**: Anchoring (Tversky & Kahneman 1974); loss aversion
  (Kahneman & Tversky 1979).
- **Psychology**: the refined-oil column sets the reference frame; our
  attributes read as gains, theirs as losses.
- **Behavior**: comparison shoppers self-close; deep links to `#product/<id>`
  turn claim into product.
- **Intent conveyed**: "Judge us against what you already use."

### SubscriptionSection "04"
- **Citation**: Cialdini (reciprocity, commitment); expectation-violation
  research on honest disclosure.
- **Psychology**: a real 10% today beats a vague promise forever; saying
  "scheduling is coming" converts skeptics instead of disappointing them.
- **Business value**: subscription attach rate raises LTV; default-off
  protects long-term trust (FTC posture).
- **Intent conveyed**: "Save honestly, leave anytime."

### TestimonialsSection "05"
- **Citation**: Cialdini (social proof); Spiegel/Northwestern (authentic
  imperfection outperforms).
- **Psychology**: voices of "people like me" settle the last doubt.
- **Intent conveyed**: "Others feed their family with this too."

---

## PDP

### Gallery (Radix lightbox)
- **Citation**: NN/g e-commerce research: product imagery is the primary
  quality signal online.
- **Psychology**: the lightbox answers the "pick it up and examine it"
  instinct physical retail satisfies.
- **Intent conveyed**: "Look closer. We have nothing to hide."

### PriceBlock (honest tiers + GST)
- **Citation**: Anchoring; Baymard total-cost transparency.
- **Psychology**: MRP anchors, GST-included prices reassure.
- **Intent conveyed**: "This is the honest number."

### VariantSelector (Radix RadioGroup)
- **Citation**: Choice-architecture defaults (Thaler & Sunstein, *Nudge*);
  accessibility = conversion.
- **Intent conveyed**: "Pick a size — the right one is pre-thought."

### SubscribeSaveRow + StickyATCBar
- **Citation**: Loss framing (Kahneman-Tversky); Fitts's Law (thumb-zone).
- **Business value**: subscription attach; mobile ATC rate.
- **Intent conveyed**: "Save 10% — the button follows you, patiently."

### Facts panel / productStory / nutritionTable / FAQ accordion
- **Citation**: Whitenton (NN/g) accordions; credibility consistency
  (label vocabulary = bottle vocabulary).
- **Intent conveyed**: "Everything the bottle knows, this page knows."

---

## Cart → Checkout → Post-purchase

### CartView (designed empty state included)
- **Citation**: Festinger (1957) cognitive dissonance; scarcity (Cialdini).
- **Psychology**: "Small-batch pressing means limited bottles" turns an
  empty cart into a reason to act.
- **Intent conveyed**: "Reserve yours — the batch is finite."

### CheckoutView (prefill, breakdown)
- **Citation**: Baymard form-length research.
- **Intent conveyed**: "Three fields and it's pressed for you."

### Order confirmation + TrackOrder + Account + loyalty
- **Citation**: Peak-end rule (Kahneman et al. 1993); goal-gradient
  (Kivetz); Cialdini commitment/consistency.
- **Intent conveyed**: "The purchase ends calmly — and your next one is
  one click away."

---

## Sensory attention layer (ADR-0027)

### Sound feedback (`useSoundFeedback`: add-to-cart drop, order chime)
- **Citation**: Visibility of status across senses (Norman); autoplay-audio
  as trust-killer (NN/g) — hence gesture-gated only; peak-end rule for the
  order chime.
- **Psychology**: the ear confirms what the eye can't verify (did the
  click land?); the two-note chime marks the purchase's remembered peak.
- **Behavior**: fewer double-adds; calmer checkout completion.
- **Business value**: error-rate reduction; remembered-experience quality
  → repeat purchase.
- **Intent conveyed**: "Your actions have a voice — soft, and only when
  you allow it."

### Sound unlock + footer mute toggle
- **Citation**: Autonomy principle (Fogg); privacy-as-trust research.
- **Psychology**: control over sensory input is respect; persisted choice
  is kept respect.
- **Intent conveyed**: "You own this page's voice, not the other way round."

### Light sweep (hero CTA) + em glow (section titles)
- **Citation**: Peripheral-motion attention capture (vision science);
  Lindgaard (aesthetic-first judgment); `prefers-reduced-motion` (WCAG 2.1
  2.3.3 / accessibility doctrine).
- **Psychology**: light is the brand's native language — oil is rendered
  sunlight; a slow golden sweep guides the eye to the one action that
  matters without shouting.
- **Behavior**: CTA salience in the first 50 ms of the visit.
- **Business value**: hero CTR.
- **Intent conveyed**: "Gold, light, warmth — start here."

### Scroll cue (hero bottom)
- **Citation**: Nielsen: users scroll when above-fold content promises
  more; explicit affordances raise scroll initiation.
- **Business value**: scroll-past-hero rate — the gate to sections 01–05.
- **Intent conveyed**: "The oils are below. Come."

### BackToTop
- **Citation**: Fitts's Law between components (placed bottom-left,
  opposite the WhatsApp bubble); orientation recovery research (NN/g).
- **Business value**: footer reach and re-entry into the funnel from any
  depth of the page.
- **Intent conveyed**: "The entrance is always one tap away."

---

## Architecture-level decisions (each also carries the five facets)

| Decision | Citation | Psychology | Behavior | Business value | Intent |
|---|---|---|---|---|---|
| Hash-based views (`#cart`, `#product/<id>`, `#policy/<key>`) | Web mental model (Nielsen) | Familiarity = safety | Sharing, back-button, recovery | Recoverable sessions | "Every state is a place." |
| `ContentContext` static fallback | Resilience doctrine | A broken shop reads as a broken brand | Buying continues in API blips | Revenue under degradation | "We are here even when the wires aren't." |
| No fake urgency/countdowns | Dark-pattern research (Mathur et al., dark-patterns study, CSCW 2019) | Manufactured pressure breeds backlash | Calmer, trustworthier decisions | Long-term trust, regulatory safety | "We sell certainty, not alarms." |
| Radix primitives for interaction | ADR-0025 | Predictability = calm | Keyboard/screen-reader parity | A11y = conversion insurance | "Everyone's hand works here." |
| Lazy-loading heavy experiences | Google/SOASTA mobile-abandonment research | Patience is finite | Fast first paint | Bounce reduction | "We earn the right to load more." |
