# 0002. Migrate the storefront to a Vite + React SPA

- Status: accepted

## Context

The live storefront is a static HTML + Tailwind-CDN page (`feldnstein_premium_store/`). Backlog story FE-1.1 requires migrating the homepage to React with full visual/behavioral parity. This record retro-documents the direction already taken in `feldnstein-react/` (React 19 + Vite 5) so future work (admin UI, PDP, possible SSR) builds on an explicit decision rather than an assumption.

## Decision Drivers

- Interactivity already exceeds vanilla-JS comfort: carousel + quick-view modal + cart state + scrollspy need real state management.
- Component reuse: the future admin UI and product pages should share one component system and design tokens.
- Team/agent familiarity and ecosystem depth (React) reduce onboarding cost.
- Performance parity is contractual: LCP ≤ 2.5s on simulated 4G (FE-1.1).

## Considered Options

1. Keep static HTML + enhance with vanilla JS — zero build step, but cart/modal/carousel state becomes hand-rolled and painful to test; does not scale to the backlog's admin tooling.
2. Vite + React SPA, client-side rendering — matches FE-1.1 scope; fast dev loop; SEO rests on static meta/OG tags in `index.html` plus crawler JS execution, with semantic-HTML parity and crawlability as FE-1.1 acceptance criteria to be verified, not assumed.
3. Next.js (SSR/SSG) — better SEO story and future-proofing, but adds a routing/rendering framework and deployment surface the backlog does not yet require (YAGNI).
4. Do nothing (keep the static page as-is, don't migrate) — ruled out without relitigating the backlog: FE-1.1 already mandates the migration; the cost of declining is an unmet P1 parity/interactivity commitment.

## Decision

Option 2: Vite + React SPA, as implemented in `feldnstein-react/`. Principles carrying the most weight: YAGNI (§3.2 — no SSR requirement exists yet) and KISS (§3.1 — the smallest toolchain meeting FE-1.1). Two-way door: adopting SSR later (e.g. Next.js or react-router SSR) is a separable migration, not a rewrite of the component system. Implementation and option analysis were substantially AI-assisted; decided and accepted by the project owner.

## Consequences

Easier: shared components for future epics; hot-reload dev loop; smoke-test harness already in place (`npm run test:smoke`). Harder: SEO must be maintained by hand in `index.html`; initial page load depends on client JS meeting the LCP budget. Reopen if: a future epic requires server-rendered dynamic pages (per-customer catalog, SEO-critical PDP at scale) — that would supersede this ADR. Missing evidence: no Lighthouse LCP measurement exists yet; the ≤ 2.5s budget is verified in FE-1.1 QA, not assumed.
