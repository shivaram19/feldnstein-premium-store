# 0006. Gaanugu platform domain on Quarkus + Flyway (Drizzle rejected)

- Status: accepted

## Context

The Phase-1 admin spec for the gaanugu business (25 pages: farmer → seed → bull → press → bottle → stock → customer) needs a real data model, replacing the generic demo entities. The project owner asked about a **Drizzle schema**, which implies a Node/TypeScript backend and would supersede the client-mandated Quarkus stack of ADR-0003.

## Decision Drivers

- ADR-0003's stack mandate (Quarkus/Java/PostgreSQL) was client-given; changing it needs strong cause.
- The existing demo backend, RBAC wiring, and operational know-how are already on Quarkus.
- Schema portability: plain SQL migrations (Flyway) outlive any ORM choice.

## Considered Options

1. **Switch to Drizzle + Node/TS** — modern DX, but discards the mandated stack and working backend; rejected (YAGNI §3.2, mandate intact).
2. **Keep Quarkus: JPA entities + Flyway SQL migrations** (recommended) — one stack, schema under version control, both Postgres and demo-H2 compatible ANSI SQL.
3. Portable DDL only, defer ORM binding — leaves the backend unbuildable; rejected.

## Decision

Option 2. Domain: `com.feldnstein.platform.gaanugu`. Flyway V1 owns all gaanugu tables (ANSI SQL, no Postgres-only types, so the H2 dev profile keeps working); Hibernate `update` mode in dev so the interim demo tables (ADR-0004) keep functioning until Phase-1 pages replace them — demo entities are then deleted, recorded as a superseding decision then. Role names from ADR-0005 carry over (AppUser.role reuses ADMIN/OPERATOR + QC/INVENTORY/SALES for segregation of duties). Drafted with AI assistance; reviewed and accepted by the project owner.

## Consequences

Easier: one backend, versioned schema, seed data realistic to gaanugu. Harder: 19 new tables to keep consistent between SQL and entities (mitigated: Flyway is canonical, entities follow it). Deferred: Phase 1 pages themselves (APIs + UI per the 25-page spec), removal of ADR-0004 demo entities, batch-status state machine enforcement logic.
