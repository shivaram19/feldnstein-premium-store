# Component Utilization Playbook — running each component at full persuasion power

The operating manual. For every component: the **persuasion lever** it owns,
how to utilize it to its fullest **now** (with the data the platform already
holds), the **metric of proof**, and the **next unlock**. Principles applied
throughout: Cialdini's levers, the commitment ladder (small yeses escalate),
ELM peripheral-route design, and the emotional architecture (care E1, purity
relief E2, nostalgia E3) — see `docs/emotional-value-architecture.md`.

The single organizing idea: **every component should make one belief
stronger.** Beliefs in order: *safe → real → for people like me → worth the
price → easy to act → worth returning to.*

---

## Stage 0 — Attention (the first 50 ms)

### Hero
- **Lever**: emotional first impression + the one action.
- **Full potential now**: headline speaks to the guardian ("The oil your
  kitchen has been missing"), sub-copy carries one proof + one feeling,
  gold CTA shine does the salience work; A/B the headline against a
  nostalgia-first variant ("Your grandmother pressed oil like this").
- **Metric**: scroll-past-hero rate, hero CTR.
- **Next unlock**: geo/time-aware copy (morning: breakfast framing;
  festival seasons: gifting).

### Scroll cue + light layer
- **Lever**: motion-guided attention.
- **Full potential**: keep the sweep slow (calm ≠ gimmick); test cue text
  against "see the five oils".
- **Metric**: % of sessions reaching section 01.
- **Next unlock**: personalized cue for returning visitors ("welcome back —
  batch 043 just pressed").

---

## Stage 1 — Trust (silence the doubt)

### ProcessSection
- **Lever**: demonstrated proof (E3 nostalgia + E4 authenticity).
- **Full potential now**: each card can carry a **real batch's press
  date and yield** from the backend ("Batch 042 — pressed Nov 12, 31 L from
  140 kg groundnut"). Numbers that exist in the admin panel but never reach
  the buyer. Add a one-line farmer credit per card.
- **Metric**: time-on-section; process→collection return scrolls.
- **Next unlock**: 20-second vertical video per phase, muted-autoplay.

### Ticker
- **Lever**: fluency/mere exposure.
- **Full potential**: rotate seasonal proof points (harvest months show
  "new-season sunflower pressing now").
- **Metric**: assisted recall (survey) — ticker is a long-game component.

### Testimonials
- **Lever**: social proof (Cialdini).
- **Full potential now**: put a name + city + oil purchased on every card;
  a photo doubles persuasion. Ask past buyers for one line via the
  post-purchase WhatsApp flow — the channel is already built.
- **Metric**: testimonial→PDP assists; section dwell.
- **Next unlock**: the **reviews backend** (Spiegel/Northwestern: the
  largest single conversion lift available to this storefront). PDP already
  renders real ratings — the data pipe is the whole job.

### Footer + Policy pages
- **Lever**: risk reversal.
- **Full potential**: cross-link each policy from the moment of anxiety
  (cart drawer links the refund policy; checkout footer links shipping
  times). A policy no one reaches persuades no one.
- **Metric**: policy-page views per 100 checkout starts.
- **Next unlock**: delivery-date estimate on the PDP (kills the #1
  pre-checkout question).

---

## Stage 2 — Value comprehension (why THIS oil)

### CollectionSection (01)
- **Lever**: curated choice + price clarity (Iyengar-Lepper).
- **Full potential now**:
  1. **Honest scarcity from real stock**: "14 bottles left in batch 042" —
     surfaced from the actual inventory API. Real scarcity converts and is
     unimpeachable; fabricated countdowns are a dark pattern (Mathur et al.
     2019). This is the single highest-value unused data hook in the system.
  2. Card badges by use-case ("for deep frying", "for the lamp") — matches
     how the guardian actually shops.
  3. Per-card press date ("pressed this month") — freshness as a visible
     attribute.
- **Metric**: card→PDP CTR; add-to-cart from card.
- **Next unlock**: "complete the kitchen" bundle suggestion (5-oil set
  pricing) at the carousel tail.

### MatrixSection (03)
- **Lever**: anchoring/loss framing.
- **Full potential**: reorder rows by the visitor's likely concern
  (health-first vs. taste-first); add a cost-per-day line ("₹11 a day for
  your family's oil") — reframes price into care vocabulary.
- **Metric**: matrix→PDP deep-link usage.
- **Next unlock**: interactive toggles (raw vs. refined vs. "premium
  refined") so the visitor builds the comparison — self-persuasion is the
  strongest kind.

---

## Stage 3 — Commitment (the ladder of yeses)

### PDP
- **Lever**: the close.
- **Full potential now**:
  1. **Batch genealogy on the facts panel**: "Pressed [date] · Seeds from
     [farmer], Guntur · Batch 042". Traceability is the brand's moat —
     industrial oils cannot copy it. This converts E2 (purity relief) at the
     decision point.
  2. Variant cards with per-day cost ("500 ml · ₹0.9/day").
  3. Sticky ATC copy test: "Add to cart — batch 042" (batch number as a
     scarcity whisper).
  4. FAQ seeded from real WhatsApp questions — the support log is free
     market research.
- **Metric**: PDP add-to-cart rate; variant-switch→add rate.
- **Next unlock**: delivery estimate + COD availability flag on the PDP.

### SubscribeSaveRow
- **Lever**: loss framing, honest.
- **Full potential**: show the rupee saving per variant ("save ₹49 on this
  1L bottle, every order"); surface the running subscription in the account
  as a status the guardian protects.
- **Metric**: subscription attach rate; retention of subscribers.
- **Next unlock**: finish the scheduling feature — the promise is already
  half-made on the page.

### CartDrawer / CartView
- **Lever**: momentum protection.
- **Full potential**: line-level savings ("you save ₹49 with Kitchen
  Reserve"); threshold nudges from real courier data ("add a 250 ml to
  unlock flat ₹49 shipping" — only if the threshold is real).
- **Metric**: drawer→checkout; cart abandonment.
- **Next unlock**: persistent cart across devices (cart token exists —
  surface "you left 2 bottles" on return).

### Checkout
- **Lever**: ability (Fogg) — remove effort, not add motivation.
- **Full potential**: address prefill is the hero (done); add a "same as
  WhatsApp number" shortcut; show the full total before the last click —
  no surprises, ever (Baymard #1).
- **Metric**: checkout completion.
- **Next unlock**: UPI intent flow (fewer redirects = fewer drops).

### Sound layer
- **Lever**: auditory confirmation (done); full potential is restraint —
  the drop must stay quiet enough to feel premium, never gamey. Audit
  against real user sessions, not taste.

---

## Stage 4 — Post-purchase memory (the remembered peak)

### Order confirmation
- **Lever**: peak-end rule.
- **Full potential now**: name the peak explicitly — "Pressed to order.
  Your batch: 042." Add the expected press/ship date and the WhatsApp
  tracking link; the confirmation should read like a receipt from a
  careful neighbor.
- **Metric**: support tickets per 100 orders (target: near zero);
  review-request response rate.
- **Next unlock**: a shareable "my batch" card (organic acquisition).

### TrackOrder + WhatsApp post-purchase flow
- **Lever**: anxiety elimination.
- **Full potential**: proactive WhatsApp messages (pressed → packed →
  shipped → delivered) — the channel and greeting flow exist; proactive
  status turns support into care. E1 (protective care) lives here as much
  as on the PDP.
- **Metric**: "where is my order" tickets; repeat-purchase rate.

### Account: orders, reorder, loyalty
- **Lever**: commitment/consistency + goal-gradient.
- **Full potential**: surface loyalty balance in the cart ("127 points —
  ₹63 toward this order"); one-tap reorder for consumables on a 45-day
  rhythm (oil runs out — the repurchase window is predictable; a reminder
  timed to consumption is service, not spam).
- **Metric**: reorder rate; time-to-second-order.
- **Next unlock**: subscriptions auto-scheduled from the first reorder
  pattern.

---

## The five data hooks that would move the needle most, ranked

1. **Real stock scarcity on cards** ("14 bottles left in batch 042") —
   inventory API → card badge. Highest value-per-effort in the system.
2. **Batch genealogy on the PDP** (press date + farmer) — traceability
   already exists in the backend; it just needs surfacing.
3. **Reviews backend** — ✅ BUILT (ADR-0028): moderated table + public
   read API + admin approve; PDP renders approved reviews only. Remaining:
   the post-purchase review REQUEST flow (item 4 below feeds it).
4. **Proactive WhatsApp order updates** — channel exists; converts support
   into care (E1).
5. **Timed reorder reminders** — consumable rhythm is predictable;
   service-framed reminders compound LTV.

## Measurement doctrine

Every component above names its metric of proof. Rule: **change one belief
per test, measure the stage metric, never the vanity metric.** A prettier
hero that doesn't raise scroll-past-hero rate is decoration, not progress.
