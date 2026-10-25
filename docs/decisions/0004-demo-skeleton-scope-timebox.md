# 0004. Demo-skeleton scope for the 10 PM client meet (timeboxed)

- Status: accepted

## Context

At 21:38 IST on 2026-10-25, ~20 minutes before the client meet, the environment had Java 21 and Node 24 but **no Maven and no Docker**. A full inventory/order/loyalty/analytics build was infeasible; a runnable skeleton that demonstrates the mandated stack and the four domains was the maximum honest deliverable.

## Decision Drivers

- Deadline: hard, 22:00 IST.
- Honesty: show what works; never fake a running system.
- Client story must still name PostgreSQL (mandated DB).

## Considered Options

1. Full build of all four domains — infeasible in the window; rejected on evidence (no Maven, no Docker, 20 minutes).
2. Runnable demo skeleton: Quarkus CRUD (rest-data-panache) for Product, StockMovement, PurchaseOrder, LoyaltyAccount, LoyaltyTransaction; an analytics summary endpoint; minimal React TSX admin viewer; Postgres via docker-compose for any machine that has Docker — **demo runs on H2 in dev profile** because this machine has no Docker; prod profile wired for Postgres.
3. Pitch only, no code — weaker for a "setup" ask; rejected.

## Decision

Option 2. Dev profile uses in-memory H2 (`drop-and-create`) purely as an environment workaround — PostgreSQL remains the database of record, delivered as docker-compose + `%prod` configuration. Scope explicitly excludes auth, validation hardening, tests, and real analytics (counts/sums only). Door type: two-way — nothing here constrains the real implementation. Generated substantially with AI assistance under project-owner time constraint; accepted by the project owner.

## Consequences

Easier: demo runs anywhere Java+Node exist; the client sees real endpoints (OpenAPI at /q/openapi) and a real UI. Harder: H2 dev profile must not leak into production assumptions; analytics is stub-quality and must be rebuilt on the real schema. Reopen if: the client expects production-shaped code in the demo — then re-scope before Sprint 1 per the product backlog.
