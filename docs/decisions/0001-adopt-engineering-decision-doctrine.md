# 0001. Adopt the Engineering Decision Doctrine

- Status: accepted

## Context

The project is moving from a static storefront to a full-stack platform (`docs/product-backlog.md`). The backlog already carries nine open questions (payment provider, auth approach, hosting, locale, …) with material, partly irreversible consequences. Historically, small teams in this situation decide ad hoc and leave no trace of why — and with AI-assisted development, there is the extra risk that tool suggestions silently become decisions.

## Decision Drivers

- Traceability: any choice can be reconstructed in two years without asking anyone.
- Evidence over intuition: decisions rest on benchmarks, docs, or explicit reasoning, not momentum or fashion.
- Shared reasoning vocabulary: one principles catalog instead of per-person taste.
- Accountability: an identifiable owner for every decision, including AI-assisted ones (NIST AI RMF, GOVERN).

## Considered Options

1. Decide ad hoc, document nothing — fastest; decisions become folklore and get relitigated endlessly.
2. ADR records only (Nygard format), no doctrine — good records, but nothing tells a decider *how* to reason or what the bar for evidence is.
3. Doctrine + MADR-lite decision log + `AGENTS.md` binding + `scripts/adr-check.sh` — full traceability for every non-trivial decision; moderate bookkeeping overhead. (Options and structure of this record were substantially drafted with AI assistance; the choice was reviewed and approved by the project owner.)

## Decision

Option 3. Adopt `docs/engineering/first-principles.md` as binding doctrine; record every decision above the trivial in `docs/decisions/` using `TEMPLATE.md`; wire the doctrine into root `AGENTS.md` so AI agents in this repo follow it; enforce log integrity with `scripts/adr-check.sh`. Principles carrying the most weight: measure-don't-guess (§3.8) and the accountability rules (§6).

## Consequences

Easier: backlog open questions now have a defined path to resolution (one record each); future maintainers inherit the "why." Harder: every non-trivial choice costs the time to write a record; discipline is required not to treat records as paperwork. Two-way door — the doctrine itself can be amended or superseded by a later ADR. Deferred: CI integration of `adr-check.sh` (planned later); resolving any actual backlog open question (each will get its own ADR when taken up).
