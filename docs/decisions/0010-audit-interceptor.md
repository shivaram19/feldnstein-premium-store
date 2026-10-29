# 0010. Audit log: annotation-driven interceptor on mutation endpoints

- Status: accepted

## Context

The nav tree includes AUDIT LOG. Food business + FSSAI context demands a tamper-evident record of
who changed what (stock movements, QC verdicts, batch status, GRNs). Not decided here: log
shipping / SIEM integration.

## Decision Drivers

- Must cover exactly the mutations that matter, without auditing noise (every master-data field edit).
- Must not require rewriting the auto-generated Panache CRUD resources.
- Cheap to query and filter from the admin UI; ADMIN-only read (segregation of duties).

## Considered Options

1. **Hibernate entity listeners** — automatic for all persistence, but cannot capture actor/context
   cleanly and misses non-entity operations; rejected.
2. **CDI interceptor with `@Audited` annotation on resource methods** — explicit, captures actor
   from SecurityIdentity, sits beside the code it audits; chosen.
3. Audit every request via a servlet filter — captures URLs but not business meaning (no entity
   ids/quantities); rejected as noise.

## Decision

Option 2. Custom `@Audited(action)` binding + `AuditInterceptor` persists `audit_event(actor,
action, entity_type, entity_id, detail_json, at)`; applied to the transactional mutation endpoints
(transfers, adjustments, batch status, QC checks, GRN, count reconciliation). Auto-generated
rest-data CRUD stays un-audited. AI-drafted; accepted by the project owner.

## Consequences

Easier: targeted, meaningful audit trail; new audited endpoints = one annotation. Harder: it is
possible to forget the annotation on a new mutation endpoint (mitigated by convention + review
checklist). Deferred: hashing/chaining for tamper evidence, retention policies, SIEM export.
