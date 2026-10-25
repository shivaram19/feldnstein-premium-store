# Design: Engineering Decision Doctrine for FELD·N·STEIN

**Date:** 2026-10-25 · **Status:** Approved · **Owner:** Engineering

## Purpose

Establish software engineering first principles for this repository — researched from internet sources with canonical citations — and turn them into a working **decision doctrine**: a procedure and record system such that every engineering decision made here (by humans or AI agents) is a conscious, traceable, evidence-based choice.

This directly serves the product backlog (`docs/product-backlog.md`), whose Open Questions (payment provider, auth approach, hosting…) are exactly the decisions this doctrine is designed to make rigorously.

## Decisions locked during brainstorming

1. Primary use: **decision doctrine** (procedure + records), not just a principles list.
2. **Every** decision above the truly trivial is recorded; trivial choices get a one-line inline note under their parent decision record.
3. The doctrine is **wired into `AGENTS.md`**, so AI coding agents working in this repo are bound by it.
4. Approach: **doctrine + decision log + enforcement tooling** (highest-traceability option).

## Deliverables

### 1. `docs/engineering/first-principles.md` — the doctrine

Sections:

- **How to reason:** first-principles thinking — reason from fundamentals, not by analogy (Musk 2013 interview; Paul Graham, "How to Think for Yourself", 2020).
- **Principles catalog:** each principle stated + canonical citation:
  - DRY — Hunt & Thomas, *The Pragmatic Programmer* (1999)
  - YAGNI — Fowler bliki (2015), from Beck/XP
  - Separation of concerns — Dijkstra, EWD447 (1974); Parnas, CACM 1972
  - SOLID — R. C. Martin (2000/2002)
  - Composition over inheritance — GoF (1994)
  - KISS & least surprise — explicitly labeled folk principles (no canonical source), defined in-house
- **The decision procedure (5 steps):**
  1. Classify the door: one-way vs two-way (Bezos 2015 shareholder letter) — reversibility sets how much deliberation is warranted.
  2. Restate the problem from first principles.
  3. Enumerate options; apply the principles catalog + last-responsible-moment (Poppendieck, *Lean Software Development*, 2003).
  4. Prefer evidence over intuition (Knuth 1974 "premature optimization"; Google SRE book ch. on monitoring; Kohavi et al. finding ~⅓ of features improve target metrics; METR 2024 RCT and Microsoft/CMU CHI 2025 study as AI-era cautionary evidence).
  5. Record the decision (see §2).
- **AI-assistance accountability rules** (original content, grounded in NIST AI RMF 1.0, GOVERN function): an identifiable human/agent owns every decision; AI output is input to judgment, never the decision itself; decisions must be explainable after the fact.
- **Sources:** full list with URLs at the end of the document.

### 2. `docs/decisions/` — the decision log (MADR-lite)

- `TEMPLATE.md` — fields: `# NNNN. Title`, Status (proposed/accepted/deprecated/superseded), Context, Decision Drivers, Considered Options, Decision, Consequences.
- Records as `docs/decisions/NNNN-kebab-title.md`, strictly sequential.
- Records are **never deleted**; wrong decisions get Status `superseded` + a pointer to the replacement.
- Recording threshold: anything beyond trivial gets its own record; trivial choices get one inline line under the record of their parent decision.
- **Seed records:**
  - `0001-adopt-engineering-decision-doctrine.md` — this doctrine.
  - `0002-react-spa-migration-direction.md` — worked example recording the already-taken direction (Vite + React 19 SPA per `feldnstein-react/`, backlog FE-1.1).

### 3. Root `AGENTS.md` — agent binding

- Concise summary of the doctrine and hard rules: consult the doctrine before non-trivial choices; write a decision record before implementing provider/framework/schema/workflow decisions; run `scripts/adr-check.sh` after adding records.

### 4. `scripts/adr-check.sh` — enforcement tooling

POSIX sh; validates the log:
- strictly sequential numbering starting at 0001,
- all template sections present in each record,
- Status values from the allowed set,
- records marked superseded reference an existing successor record.
Exits 0 and prints a summary on success; exits 1 with specific error lines on failure.

**Verification:** run against (a) the seeded valid records → expect exit 0; (b) a temporary deliberately-broken fixture → expect exit 1 with clear errors; fixture deleted afterwards.

## Out of scope

- CI pipeline integration (a workflow can call the script later; not part of this change).
- Resolving any of the backlog's Open Questions — the doctrine governs *how* they'll be decided.
- Changes to `feldnstein-react/` application code.

## Sources (researched 2026-10-25)

- M. Nygard, "Documenting Architecture Decisions" (2011) — https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- MADR — https://adr.github.io/madr/
- M. Fowler, "Yagni" — https://martinfowler.com/bliki/Yagni.html
- E. W. Dijkstra, EWD447 — https://www.cs.utexas.edu/users/EWD/transcriptions/EWD04xx/EWD447.html
- Bezos 2015 Amazon shareholder letter — https://www.amazon.com/ideas/amazon-2015-letter-to-shareholders
- NIST AI RMF 1.0 — https://www.nist.gov/itl/ai-risk-management-framework
- METR RCT, arXiv:2405.15793 — https://arxiv.org/abs/2405.15793
- Lee, Tan et al. (Microsoft/CMU), arXiv:2502.13047 — https://arxiv.org/abs/2502.13047
- D. Knuth, "Structured Programming with go to Statements" (1974) — https://doi.org/10.1145/356635.356640
- Google SRE Book, "Monitoring Distributed Systems" — https://sre.google/sre-book/monitoring-distributed-systems/
- P. Graham, "How to Think for Yourself" (2020) — https://paulgraham.com/think.html
- Hunt & Thomas DRY interview — https://www.artima.com/articles/orthogonality-and-the-dry-principle
