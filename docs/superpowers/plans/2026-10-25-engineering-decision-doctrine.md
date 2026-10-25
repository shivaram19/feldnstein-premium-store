# Engineering Decision Doctrine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the engineering decision doctrine document, a MADR-lite decision log with two seed records, a root `AGENTS.md` binding AI agents to it, and a validation script — all grounded in cited internet sources.

**Architecture:** Four new files plus one shell script; no application code changes. The doctrine (`docs/engineering/first-principles.md`) is the source of truth; `docs/decisions/` holds numbered records (`NNNN-kebab-title.md`, never deleted); `AGENTS.md` binds agents; `scripts/adr-check.sh` enforces log integrity.

**Tech Stack:** Markdown, POSIX sh, grep/sed/ls coreutils.

**Spec:** `docs/superpowers/specs/2026-10-25-engineering-decision-doctrine-design.md`

---

### Task 1: Doctrine document

**Files:**
- Create: `docs/engineering/first-principles.md`

- [x] **Step 1: Write the doctrine**

Create `docs/engineering/first-principles.md` with exactly this content:

```markdown
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
```

- [x] **Step 2: Commit**

```bash
git add docs/engineering/first-principles.md
git commit -m "docs: engineering first principles and decision doctrine"
```

---

### Task 2: Decision log template + ADR-0001

**Files:**
- Create: `docs/decisions/TEMPLATE.md`
- Create: `docs/decisions/0001-adopt-engineering-decision-doctrine.md`

- [x] **Step 1: Write the template**

Create `docs/decisions/TEMPLATE.md` with exactly this content:

```markdown
# NNNN. <Decision title>

- Status: proposed | accepted | deprecated | superseded
- Superseded by: <ADR number, e.g. 0003> (only when Status is superseded)
Status meanings: proposed = under discussion · accepted = decided · deprecated = no longer relevant, no successor needed · superseded = replaced by a later ADR, requires the "- Superseded by:" pointer above.

## Context

<The situation. What problem forces this decision? What is NOT being decided?>

## Decision Drivers

- <What matters in this decision — quality attributes, constraints, deadlines>

## Considered Options

1. <Option A> — <one-line strengths / weaknesses>
2. <Option B> — <one-line strengths / weaknesses>
N. Do nothing — <cost of not deciding> (always include this option, in any position)

## Decision

<The chosen option, in one or two sentences, and the reason it wins. State which principles from docs/engineering/first-principles.md carried the most weight. Note any AI-tool involvement in generating options or evidence.>

## Consequences

<What becomes easier, what becomes harder, what is explicitly deferred or out of scope. Note the door type (one-way / two-way) and what evidence would reopen this decision.>
```

- [x] **Step 2: Write ADR-0001**

Create `docs/decisions/0001-adopt-engineering-decision-doctrine.md` with exactly this content:

```markdown
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
```

- [x] **Step 3: Commit**

```bash
git add docs/decisions/TEMPLATE.md docs/decisions/0001-adopt-engineering-decision-doctrine.md
git commit -m "docs: decision log template and ADR-0001 (adopt doctrine)"
```

---

### Task 3: ADR-0002 (worked example)

**Files:**
- Create: `docs/decisions/0002-vite-react-spa-migration.md`

- [ ] **Step 1: Write ADR-0002**

Create `docs/decisions/0002-vite-react-spa-migration.md` with exactly this content:

```markdown
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

1. Keep static HTML + enhance with vanilla JS — zero build step, but cart/modal/carousel state becomes hand-rolled and untestable; does not scale to the backlog's admin tooling.
2. Vite + React SPA, client-side rendering — matches FE-1.1 scope; fast dev loop; SEO handled via static meta/OG tags in `index.html` (acceptable: homepage content is crawlable HTML rendered at build time, not behind client data fetching).
3. Next.js (SSR/SSG) — better SEO story and future-proofing, but adds a server runtime, routing model, and deployment surface the backlog does not yet require (YAGNI).

## Decision

Option 2: Vite + React SPA, as implemented in `feldnstein-react/`. Principles carrying the most weight: YAGNI (§3.2 — no SSR requirement exists yet) and KISS (§3.1 — the smallest toolchain meeting FE-1.1). Two-way door: adopting SSR later (e.g. Next.js or react-router SSR) is a separable migration, not a rewrite of the component system.

## Consequences

Easier: shared components for future epics; hot-reload dev loop; smoke-test harness already in place (`npm run test:smoke`). Harder: SEO must be maintained by hand in `index.html`; initial page load depends on client JS meeting the LCP budget. Reopen if: a future epic requires server-rendered dynamic pages (per-customer catalog, SEO-critical PDP at scale) — that would supersede this ADR.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decisions/0002-vite-react-spa-migration.md
git commit -m "docs: ADR-0002 recording Vite+React SPA migration direction"
```

---

### Task 4: Root AGENTS.md

**Files:**
- Create: `AGENTS.md` (repo root)

- [ ] **Step 1: Check for an existing AGENTS.md**

Run: `ls AGENTS.md 2>/dev/null || echo "absent"`
Expected: `absent` (the project currently has no root AGENTS.md). If a file exists, read it and append this content under a new section instead of overwriting.

- [ ] **Step 2: Write AGENTS.md**

Create `AGENTS.md` at the repo root with exactly this content:

```markdown
# AGENTS.md — Engineering Decision Doctrine (binding)

This repository follows the engineering decision doctrine in `docs/engineering/first-principles.md`. **Read it before making any non-trivial engineering choice** (technology, provider, schema, architecture, workflow).

Hard rules for every agent working in this repo:

1. **Record before implementing.** Every decision above the trivial gets a record in `docs/decisions/` (copy `docs/decisions/TEMPLATE.md`) *before* the corresponding change lands. Number records sequentially (`NNNN-kebab-title.md`). Truly trivial choices get a one-line note under their parent decision's record instead.
2. **Follow the 5-step procedure** (`docs/engineering/first-principles.md` §4): classify reversibility → restate from first principles → enumerate options → seek evidence → record.
3. **Evidence over intuition.** Don't optimize, build, or claim without measurement or a cited source (§3.8). Don't build presumptive features (§3.2, YAGNI).
4. **AI output is input, not decision** (§6). If options or code substantially came from AI tools, the record must say so; the named human owner remains accountable.
5. **Never delete a decision record** — mark it `Status: superseded` with a `- Superseded by:` pointer to the replacement.
6. **Validate before committing.** After adding or editing records, run `sh scripts/adr-check.sh` from the repo root; it must pass.
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: AGENTS.md binding agents to decision doctrine"
```

---

### Task 5: Validation script (TDD)

**Files:**
- Create: `scripts/adr-check.sh`

- [ ] **Step 1: Write the failing test (run before the script exists)**

Run: `sh scripts/adr-check.sh docs/decisions`
Expected: FAIL — `scripts/adr-check.sh: No such file or directory`. This is the red state: the check cannot pass yet.

- [ ] **Step 2: Implement the script**

Create `scripts/adr-check.sh` with exactly this content:

```bash
#!/usr/bin/env sh
# adr-check.sh — validate the decision log in docs/decisions/
# Usage: sh scripts/adr-check.sh [decisions-dir]   (default: docs/decisions)
set -u

DECISIONS_DIR="${1:-docs/decisions}"
errors=0
records=0

report() {
  echo "ERROR: $1" >&2
  errors=$((errors + 1))
}

if [ ! -d "$DECISIONS_DIR" ]; then
  echo "ERROR: directory $DECISIONS_DIR not found" >&2
  exit 1
fi

found=0
for f in "$DECISIONS_DIR"/[0-9]*.md; do
  [ -e "$f" ] || continue
  found=1
  records=$((records + 1))
  base=$(basename "$f")

  # filename format: NNNN-kebab-title.md
  if ! echo "$base" | grep -Eq '^[0-9]{4}-[a-z0-9-]+\.md$'; then
    report "$f: filename must be NNNN-kebab-title.md"
  fi

  # required sections
  for section in "## Context" "## Decision Drivers" "## Considered Options" "## Decision" "## Consequences"; do
    grep -q "^$section" "$f" || report "$f: missing section '$section'"
  done

  # status
  status=$(sed -n 's/^- Status: *//p' "$f" | head -n 1 | tr -d '[:space:]')
  case "$status" in
    proposed|accepted|deprecated|superseded) ;;
    *) report "$f: missing or invalid '- Status:' (got '${status:-none}')" ;;
  esac

  # superseded records must point at an existing successor
  if [ "$status" = "superseded" ]; then
    succ=$(sed -n 's/^- Superseded by: *//p' "$f" | head -n 1 | tr -d '[:space:]')
    if [ -z "$succ" ]; then
      report "$f: status superseded but no '- Superseded by:' line"
    elif ! ls "$DECISIONS_DIR/$succ"-*.md >/dev/null 2>&1; then
      report "$f: superseded by '$succ' but no matching record exists"
    fi
  fi
done

# sequential numbering starting at 0001
expected=1
for f in $(ls "$DECISIONS_DIR"/[0-9]*.md 2>/dev/null | sort); do
  num=$(basename "$f" | cut -c1-4)
  stripped=$(echo "$num" | sed 's/^0*//')
  [ -n "$stripped" ] || stripped=0
  if [ "$stripped" -ne "$expected" ]; then
    report "$f: expected record number $(printf '%04d' "$expected"), got $num"
  fi
  expected=$((expected + 1))
done

if [ "$found" -eq 0 ]; then
  report "no decision records found in $DECISIONS_DIR"
fi

if [ "$errors" -gt 0 ]; then
  echo "adr-check: FAILED ($errors error(s), $records record(s))" >&2
  exit 1
fi
echo "adr-check: OK ($records record(s))"
```

- [ ] **Step 3: Run against the seeded log — expect pass**

Run: `sh scripts/adr-check.sh docs/decisions`
Expected: `adr-check: OK (2 record(s))`, exit 0.

- [ ] **Step 4: Test failure detection with a broken fixture**

Create `docs/decisions/9999-broken-fixture.md` with exactly this content (bad number, missing sections, invalid status):

```markdown
# 9999. Broken fixture

- Status: maybe

This file is intentionally invalid for testing adr-check.sh.
```

Run: `sh scripts/adr-check.sh docs/decisions`
Expected: exit 1, with errors on stderr for: expected record number 0003 got 9999, missing sections ('## Context', '## Decision Drivers', '## Considered Options', '## Decision', '## Consequences'), invalid status.

- [ ] **Step 5: Remove fixture and re-verify**

Run:
```bash
rm docs/decisions/9999-broken-fixture.md
sh scripts/adr-check.sh docs/decisions
```
Expected: `adr-check: OK (2 record(s))`, exit 0.

- [ ] **Step 6: Commit**

```bash
chmod +x scripts/adr-check.sh
git add scripts/adr-check.sh
git commit -m "tools: adr-check.sh validates decision log integrity"
```

---

### Task 6: Final end-to-end verification

**Files:**
- No new files.

- [ ] **Step 1: Verify all deliverables exist and the check passes**

Run:
```bash
ls docs/engineering/first-principles.md docs/decisions/TEMPLATE.md docs/decisions/0001-adopt-engineering-decision-doctrine.md docs/decisions/0002-vite-react-spa-migration.md AGENTS.md scripts/adr-check.sh
sh scripts/adr-check.sh docs/decisions
git log --oneline -6
```
Expected: all six files listed; `adr-check: OK (2 record(s))`; six commits visible (spec commit + Tasks 1–5 commits).

- [ ] **Step 2: Confirm the React app is untouched**

Run: `git status --porcelain feldnstein-react feldnstein_premium_store`
Expected: no output (application code unchanged).
