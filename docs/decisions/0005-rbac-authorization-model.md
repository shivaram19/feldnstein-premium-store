# 0005. Authorization model is RBAC (client mandate)

- Status: accepted

## Context

At the 2026-10-25 client meet, the client settled the platform's authorization model: **role-based access control (RBAC)**. This answers half of backlog Open Question #2 (auth approach). The full auth epic (registration, sessions, customer login) remains a Sprint-1 item; this decision fixes the *model* so both the demo skeleton and the real implementation build toward it.

## Decision Drivers

- Client mandate (hard constraint).
- Backlog already sketches roles: `customer | admin` (AUTH-1.1), plus admin-tool reality implies at least an operator/staff tier between them.
- Small team: RBAC is the simplest model that separates "runs the business" from "buys".

## Considered Options

1. Client-mandated RBAC — roles held on the user, checked at endpoints; well understood, sufficient for a single-store platform.
2. Do nothing / relitigate (ACL per-resource, ABAC/attribute-based) — rejected: mandate in hand; ABAC is overkill at this scale (KISS, §3.1).

## Decision

Option 1. Role set for the platform: **ADMIN** (everything, incl. analytics), **OPERATOR** (inventory & order operations, no analytics), **CUSTOMER** (future storefront scope; unused by the demo's admin API). Demo skeleton implements it with Quarkus file-realm Basic auth (elytron properties) purely as a stand-in — the real implementation must replace this with database-backed roles and token/session auth (AUTH-1.1), keeping the same role names. Drafted with AI assistance under project-owner instruction for the demo; mandate from the client, accepted by the project owner.

## Consequences

Easier: demo shows real 401/403 behavior per role; the real auth epic inherits named roles instead of inventing them. Harder: every new endpoint must declare its role (deny-by-default discipline required); file-realm users must never reach production — add a prod guard when wiring the real auth. One-way door: renaming roles later means data migration — treat names as fixed. Deferred (unchanged, now under this model): in-house vs managed IdP decision for AUTH-1.1; customer-facing registration; method-level fine-grained permissions.
