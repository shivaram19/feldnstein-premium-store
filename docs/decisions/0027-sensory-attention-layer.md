# 0027. Sensory attention layer — gesture-gated sound, light motion, gap-fix components

- Status: accepted

## Context

Attention is the scarce currency of the storefront; light and sound are its
two native carriers. The ask: components that captivate attention and close
UX gaps, each carrying derivable business value. What is NOT being decided:
autoplay audio, notification-style interruption, or motion that ignores
accessibility preferences.

## Decision Drivers

- **Attention economy**: the page competes with every other tab; feedback
  must be felt, not just seen.
- **Autonomy**: sound on a commerce page without consent is a dark pattern.
- **Accessibility**: motion must yield to `prefers-reduced-motion`.
- **Business value per component**: each addition maps to a measurable KPI.

## Considered Options

1. **Gesture-gated Web Audio micro-sonics + CSS light motion** — sound only
   after the user's first interaction (browser-enforced anyway), master gain
   low, persistent mute; light via CSS keyframes with reduced-motion guard.
   Weakness: generated tones must be tuned to feel "oil-drop", not "app".
2. **Autoplay ambient audio + video everywhere** — maximal sensory impact;
   rejected: autoplay audio is a documented trust-killer (NN/g), browsers
   block it, and it contradicts the brand's calm.
3. **Sound only on order success** — minimal; rejected as too thin: the
   add-to-cart moment is the highest-frequency feedback point in the funnel.
4. Do nothing — attention leaks at every micro-feedback gap; competitors
   with calmer, more responsive pages convert the difference.

## Decision

Option 1. Sound: a `useSoundFeedback` module (Web Audio, no asset files)
plays a soft "oil-drop" tone on add-to-cart and a two-note chime on order
placement, unlocked by the first user gesture, mutable via a footer toggle
persisted in localStorage. Light: a golden sheen sweep on the hero CTA and
a slow glow on the gold `em` accents, all under a global
`prefers-reduced-motion` kill-switch. Gap-fix components shipped with it:
back-to-top control, hero scroll cue, designed empty-cart state.
Principles weighted most: autonomy (§3 evidence-over-intuition), long-term
trust over short-term stimulus.

## Consequences

- Add-to-cart gains **auditory confirmation** (visibility-of-status across
  senses; prevents double-adds) — KPI: add-to-cart error rate, drawer
  throughput.
- Order success gains a memorable auditory peak — KPI: support tickets,
  remembered-experience quality (peak-end rule, already in the component map).
- Light motion lifts hero CTA salience without layout cost — KPI: hero CTR.
- Back-to-top / scroll cue attack orientation loss on a long mobile page —
  KPI: scroll depth, footer reach.
- Empty-cart state converts a dead-end into a return path — KPI: session
  recovery.
- Two-way door: the mute toggle and reduced-motion guard mean any component
  can be removed without data-model or flow changes.
