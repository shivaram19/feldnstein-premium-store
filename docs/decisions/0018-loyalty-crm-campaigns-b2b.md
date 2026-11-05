# 0018. Loyalty, CRM, bulk campaigns, and B2B wholesale — in-house domain modules over external suites

- Status: accepted

## Context

Four marketing/operations capabilities were requested on one platform: (1) loyalty management, (2) CRM, (3) bulk-mail campaigns to customers, (4) a B2B seller section in inventory to track orders sent to sellers. Internet research was done for open-source projects covering each.

## Decision Drivers

- One platform, one database, one RBAC model — not a federation of heavyweight external systems (the repo already runs Quarkus + PostgreSQL + React on a free tier)
- YAGNI (§3.2): no usage evidence for enterprise suites; demo mode must work offline
- Consistency with ADR-0016's provider-fallback pattern for anything externally providable (email sending)
- Loyalty points are core business rules (earn rate, redemption value, tax treatment) — per FitGap/joy.so research, operators who need code-level control self-host the engine as infrastructure, not a service

## Considered Options

1. In-house domain modules for loyalty + CRM-360 + B2B, campaign support added to the existing Listmonk port — one schema, one auth model, demo-capable; cost: we build and maintain the logic
2. Adopt external suites: Twenty/SuiteCRM for CRM, Medusa B2B or ERPNext for wholesale, Mautic for campaigns, a TS "agent-first promotion engine" for loyalty — best-of-breed each; cost: 3–4 parallel systems, sync pipelines, per-system RBAC, free-tier-hosting infeasible (PostHog-class footprint lesson from ADR-0016)
3. Hybrid: in-house loyalty/B2B (core rules), external CRM (Twenty) synced by email — better CRM UX sooner; cost: sync + conflict logic before a second CRM user exists

## Decision

Option 1, with option 3 recorded as the reopen path. Loyalty is a new `loyalty` package (account, append-only transaction ledger, earn on order DELIVERED at configurable `loyalty.earn-percent`, redemption at checkout capped by balance, admin adjustment with reason). "CRM" is a Customer-360 read model aggregated by email (orders, spend, points, subscription) — not a separate contact database. Campaigns extend the ADR-0016 NewsletterGateway port (Listmonk create-and-send; demo records the campaign with simulated recipients). B2B is a `b2b` package (seller directory; wholesale order lifecycle DRAFT→CONFIRMED→DISPATCHED→DELIVERED/CANCELLED with server-computed GST totals and FEFO stock deduction at dispatch). Options shortlist from web research (Twenty, SuiteCRM, EspoCRM, Dolibarr, Medusa, ERPNext, Mautic, Listmonk, Gorse-class engines); framing with AI assistance; owner accountable.

## Consequences

- Migrations V15 (loyalty_account, loyalty_transaction, campaign) and V16 (b2b_seller, b2b_order, b2b_order_line)
- Door type: two-way — modules are self-contained packages; external CRM/campaign suites can be integrated behind ports later without touching domain logic
- Reopen triggers: a second sales/CRM user appears (→ Twenty behind a port), behavioural drip campaigns requested (→ Mautic), multi-price-list B2B portals (→ Medusa-class)
- Explicitly out of scope: referral programs, tier/VIP programs, loyalty expiry, B2B seller self-service portal, per-seller price lists, partial dispatch
