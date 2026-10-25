# FELD·N·STEIN — Engineering First Principles & Decision Doctrine

**Version:** 1.0 · **Date:** 2026-10-25 · **Status:** Adopted (ADR-0001)

This document is binding for everyone working in this repository — human or AI agent. If a decision matters, it is made *consciously*: reasoned from fundamentals, weighed against evidence, and recorded. If it is not recorded, it was not decided.

---

## 1. Why this document exists

This project is moving from a static storefront to a full-stack platform (`docs/product-backlog.md`). Along the way it will face consequential, hard-to-reverse choices — payment provider, auth approach, hosting, schema. Left implicit, those decisions get made by momentum, fashion, or whatever an AI tool suggested last. This doctrine exists so that every such decision is instead a deliberate act of engineering judgment.

## 2. How to reason: first principles

Reason from **first principles, not by analogy**. Analogy asks "what do stores like this usually do?" First principles ask:

1. What is the actual problem? (State it in one sentence, without solution vocabulary.)
2. What are the fundamental constraints? (physics of the domain, money, time, regulation, the brand promise — e.g. *lab-tested batches are first-class*.)
3. What follows from those constraints? Build the solution upward from them.

Analogy is allowed as a *source of hypotheses*, never as the justification for a decision. "Industry best practice" is a hypothesis to test against this project's fundamentals, not a reason.

## 3. Principles catalog

These principles are the lenses every decision is checked against. They are ordered loosely from most to least universally applicable; conflicts between principles are themselves a decision to record (state which principle won and why).

### 3.1 Keep it simple (KISS)

*Folk principle — no canonical source; defined here.* Choose the simplest solution that meets the stated need. Complexity must pay rent: every abstraction, layer, and dependency must justify itself with a concrete benefit. When two options meet the requirements equally, the one with fewer moving parts wins by default.

### 3.2 You Aren't Gonna Need It (YAGNI)

*Kent Beck, Extreme Programming; best write-up: Martin Fowler, "Yagni" (2015).* Do not build presumptive features. A feature that isn't needed yet costs four times: build cost, delay cost, carry cost (complexity maintained forever), and repair cost (rework when reality differs from the prediction). Build what the backlog asks for now; design seams, not features.

### 3.3 Don't Repeat Yourself (DRY)

*Andy Hunt & Dave Thomas, The Pragmatic Programmer (1999): "Every piece of knowledge must have a single, unambiguous, authoritative representation."* Duplicated knowledge drifts. Note: DRY is about *knowledge*, not text — two similar-looking code blocks that express different domain rules should not be merged.

### 3.4 Separation of concerns (SoC)

*Edsger W. Dijkstra, "On the Role of Scientific Thought," EWD447 (1974); practice grounded by David Parnas, CACM (1972).* Each module answers one question: *what does it do, how do you use it, what does it depend on?* If you cannot answer all three without reading the internals, the boundary is wrong.

### 3.5 SOLID

*Robert C. Martin (2000/2002).* Especially load-bearing here: **Single Responsibility** (a module changes for one reason) and **Dependency Inversion** (depend on abstractions at boundaries — payments, storage, auth — so providers remain replaceable).

### 3.6 Composition over inheritance

*Gamma, Helm, Johnson & Vlissides, Design Patterns (1994), §1.6: "Favor object composition over class inheritance."* Prefer assembling behavior from small units over deep class hierarchies.

### 3.7 Principle of least surprise

*Folk principle (closest anchor: Saltzer & Schroeder, "psychological acceptability," 1975); defined here.* Code and interfaces should behave the way a competent reader would predict. Naming, defaults, and error behavior are design decisions, not afterthoughts.

### 3.8 Measure, don't guess

*Donald Knuth (1974): "premature optimization is the root of all evil"; Google SRE Book (2016), ch. "Monitoring Distributed Systems."* Performance claims, capacity claims, and "users will want this" claims are hypotheses. Profile, benchmark, or instrument before acting on them — and act on the result, not the impression. (See the METR 2024 and Microsoft/CMU 2025 studies in §7: experienced developers were *certain* AI tooling made them faster; the measurements said otherwise. Confidence is not evidence.)

## 4. The decision procedure

Every decision above the trivial runs this loop. The record it produces lives in `docs/decisions/` (see §5).

1. **Classify the door.** Is this a one-way door (hard to reverse: schema, payment provider, public API shape) or a two-way door (framework, library, file layout)? *Jeff Bezos, Amazon 2015 shareholder letter.* Two-way doors deserve fast, lightweight decisions — lightweight means fewer options and lighter evidence, not no record; one-way doors deserve the full procedure below.
2. **Restate from first principles** (§2): the real problem and the fundamental constraints — in writing, in the record.
3. **Enumerate options** — at least two, plus "do nothing." Apply the principles catalog (§3) and the last-responsible-moment rule: defer binding choices until failing to decide would eliminate an important alternative (*Poppendieck, Lean Software Development, 2003*). Do not decide earlier than you must; do not decide later than you can.
4. **Seek evidence over intuition**: benchmarks, prototypes, documentation, prior art. Note explicitly what evidence is missing and what would change your mind.
5. **Record it** using the template in `docs/decisions/TEMPLATE.md`, then run `sh scripts/adr-check.sh` from the repo root.

Truly trivial choices (naming a local variable, a one-line style fix) do not need their own record — note them in one line under the record of their parent decision instead — or in the commit message when no parent record exists.

## 5. Recording decisions

- Records live in `docs/decisions/` as `NNNN-kebab-title.md`, numbered strictly sequentially from `0001`.
- **Never delete a record.** A wrong decision is marked `Status: superseded` with a `- Superseded by:` pointer to its replacement. History is data.
- Every record captures: Context, Decision Drivers, Considered Options, Decision, Consequences — so a future reader can reconstruct *why*, not just *what*.
- An ADR is a letter to a future maintainer, not a verdict (after Nygard, 2011). Write it to be read with fresh eyes in two years.

## 6. AI-assistance accountability rules

Grounded in the NIST AI Risk Management Framework 1.0 (GOVERN function, 2023): responsibility for outcomes of AI-assisted work stays with humans.

1. **AI output is input, not decision.** Suggestions from coding tools (including agents operating in this repo) are candidates to evaluate through the §4 procedure — never the decision itself.
2. **Every decision has an owner.** The record names who (or which agent, and under whose instruction) decided.
3. **Explainability after the fact.** If you cannot write the Context and Decision sections of a record without the AI present, the decision is not finished.
4. **Disclose AI involvement.** Records should note when options or evidence were substantially generated by AI tools.
5. **Guard against automation bias.** The Microsoft/CMU CHI 2025 study found that confidence in AI tools was associated with reduced critical-thinking effort. Countermeasure: actively try to falsify AI-suggested options before accepting them.

## 7. Sources

1. First principles: E. Musk interview (2013), https://www.youtube.com/watch?v=L-s_3b5fRd8 · P. Graham, "How to Think for Yourself" (2020), https://paulgraham.com/think.html
2. KISS — folk principle, defined in §3.1.
3. YAGNI: M. Fowler, https://martinfowler.com/bliki/Yagni.html
4. DRY: Hunt & Thomas; authors' restatement: https://www.artima.com/articles/orthogonality-and-the-dry-principle
5. SoC: Dijkstra, EWD447, https://www.cs.utexas.edu/users/EWD/transcriptions/EWD04xx/EWD447.html · Parnas, https://doi.org/10.1145/361598.361623
6. SOLID: R. C. Martin, *Agile Software Development: PPP* (2002)
7. Composition over inheritance: GoF, *Design Patterns* (1994)
8. Least surprise: folk principle; proxy anchor Saltzer & Schroeder (1975), https://doi.org/10.1109/PROC.1975.9939
9. Measure, don't guess: Knuth (1974), https://doi.org/10.1145/356635.356640 · Google SRE Book, https://sre.google/sre-book/monitoring-distributed-systems/
10. One-way/two-way doors: Bezos, Amazon 2015 shareholder letter, https://www.amazon.com/ideas/amazon-2015-letter-to-shareholders
11. Last responsible moment: Poppendieck, *Lean Software Development* (2003)
12. ADR practice: Nygard (2011), https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions · MADR, https://adr.github.io/madr/
13. NIST AI RMF 1.0 (2023), https://www.nist.gov/itl/ai-risk-management-framework
14. METR RCT (2024), https://arxiv.org/abs/2405.15793
15. Lee, Tan et al., Microsoft/CMU (CHI 2025), https://arxiv.org/abs/2502.13047
