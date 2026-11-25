# 0029. Vernacular-first slice — Telugu chrome toggle

- Status: accepted

## Context

citations-verified §D tension 3: the market's growth is Indian-language-first
(Google/KPMG & IAMAI: most new Indian internet users prefer Indian
languages), while the storefront was English-only. A full i18n pass (every
string, PDP content, policies) is a multi-week effort; shipping nothing
while perfecting everything forfeits the lever.

## Decision Drivers

- The highest-traffic chrome (nav, hero, CTAs, section labels, footer group
  titles) carries the first 10 seconds of every visit — the glance layer the
  reels-trained buyer judges in.
- Telugu is the heartland language of the brand's origin (Mothadaka, Guntur).

## Considered Options

1. **Chrome-level dictionary toggle (chosen)** — ~20 hand-written keys, no
   library, ships today. Weakness: partial coverage, mixed-language pages.
2. **Full i18n framework pass** — react-i18next + every string externalized;
   rejected for now: multi-week effort that forfeits the lever while
   perfecting it; can adopt later without changing call sites.
3. **Separate Telugu site/page** — rejected: splits SEO, doubles content
   drift, abandons the toggle's instant agency.
4. Do nothing — the market's growth stays linguistically locked out.

## Decision

Ship a chrome-level language toggle (EN / తెలుగు): a `LanguageContext` with
a small hand-written dictionary covering nav, hero copy, primary CTAs, the
five section labels, and footer group titles. Choice persists in
localStorage. Product data, PDP content, and policies remain English in this
slice — stated openly in the UI (toggle tooltip) rather than pretending
full coverage.

## Consequences

- The glance layer speaks the buyer's mother tongue at the exact moment
  tension 1 says the judgment happens.
- Dictionary-over-framework: no i18n library, ~20 keys, zero bundle cost
  beyond the dictionary object. Expanding coverage is additive (more keys,
  more components calling `t()`).
- Honest-slice risk: mixed-language pages. Mitigation: the toggle labels the
  state ("More languages coming"); tension 3 is *relaxed*, not resolved.
- Two-way door: the dictionary can migrate to a full i18n framework or
  backend-driven content without changing call sites.
