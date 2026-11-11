# 0021. Purge automated-test data via migration

- Status: accepted

## Context

Manual demo/testing on the live Render database surfaced machine-generated test
fixtures in customer-facing screens: `E2E-*`/`DUP-E2E` batches, POs, farmers, count
plans, plus two suppliers literally named `<script>alert(1)</script>` (an earlier
XSS probe). The count-plan and order-allocation FK chains make several of these rows
undeletable through the API (no DELETE on count resources by design), so data
hygiene cannot be completed operationally.

## Decision Drivers

- Demo credibility: client-facing screens must not show test artifacts.
- Audit integrity: count plans are a designed permanent record (no DELETE endpoint),
  so purge must run below the API, with the same child-first FK discipline.
- Repeatability: any environment (dev H2, live Postgres) that accumulates tagged rows
  should clean itself on deploy rather than requiring manual surgery.

## Considered Options

1. **Flyway migration deleting tagged rows** — runs everywhere Flyway runs; one-way
   (deletes); patterns (`%E2E-%`, `%CRUD%`, `%<script>%`) match only machine tags.
2. **Manual/API cleanup per environment** — reversible but cannot clear count plans
   (no DELETE), leaving visible residue; does not protect future environments.
3. Do nothing — test artifacts persist in client demos; XSS-named rows remain a
   reputational risk even if rendered harmlessly.

## Decision

Option 1: `V19__purge_test_data.sql` deletes tagged fixtures child-first (allocations
and count lines, procurement children, production children, masters). First-principles
weight: §3.8 evidence over intuition (root-caused each FK blocker before writing SQL;
verified locally against H2 that zero tagged rows survive) and the demo-credibility
driver above. Options/SQL authored by AI tools; human owner accountable.

## Consequences

- Every deploy self-cleans tagged test rows; e2e/CRUD runs still work because they
  create their tags after the migration runs.
- One-way door for matching rows: a legitimate row containing these exact tag
  markers would be deleted. Reopen if real business data ever adopts such markers.
- Does not change the no-DELETE design of count plans; it is precisely the escape
  hatch for that design's permanent-record rule.
