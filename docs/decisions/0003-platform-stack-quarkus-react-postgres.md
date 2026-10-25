# 0003. Platform stack: Quarkus + React (TSX) + PostgreSQL

- Status: accepted

## Context

Client meeting 2026-10-25 22:00 IST requires the commerce platform's backend, frontend, and database stack to be decided and demonstrable. The client mandated the stack directly, so this record documents a given constraint rather than a deliberated choice; it exists so future work does not relitigate it silently.

## Decision Drivers

- Client mandate (hard constraint): backend Quarkus, frontend React with TypeScript (TSX), database PostgreSQL.
- Team/agent familiarity and hiring market (React, Java).
- Brand promise (lab-tested batches) implies transactional integrity needs (orders, inventory ledger) that PostgreSQL satisfies.

## Considered Options

1. Client-mandated stack (Quarkus / React TSX / PostgreSQL) — satisfies the client constraint; mature ecosystems.
2. Do nothing / propose an alternative — rejected: the mandate came from the client; relitigating it uninvited costs trust and time.

## Decision

Option 1, as mandated. Backend: Quarkus 3.x (Java 21) with quarkus-rest, Hibernate ORM Panache, rest-data-panache for CRUD; OpenAPI for API docs. Frontend: React 19 + TypeScript via Vite. Database: PostgreSQL 16 (production), provisioned via docker-compose. Implementation and record drafted substantially with AI assistance under project-owner instruction for the 10 PM client meet; decided and accepted by the project owner.

## Consequences

Easier: single coherent stack the client expects; Panache/rest-data-panache minimizes boilerplate. Harder: JVM build times; Java toolchain required. Two-way door for framework versions; one-way-ish for DB choice once data exists (standard Postgres mitigates). Deferred: auth, migrations (Flyway), tests — post-demo epics per backlog.
