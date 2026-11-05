# 0019. Single-platform CRM with WhatsApp/Instagram channels — Meta Cloud API behind a port

- Status: accepted

## Context

ADR-0018 delivered a read-only Customer-360. The owner asked to *manage* customer relationships on the single platform, explicitly including WhatsApp and Instagram — the two channels Indian DTC food brands actually sell and support on. Interactions must be attributable (who said what, when, on which channel) and follow-ups must not fall through cracks.

## Decision Drivers

- Single system of record: conversation history next to orders, loyalty, and fulfilment (§3.2 — no second support inbox before there is a support team)
- Honest integration: WhatsApp sending requires Meta's Cloud API (business verification, templates); Instagram DMs require the Graph API Messaging features — neither is self-hostable open source, so the pattern must be provider-with-demo-fallback
- Demo-ability: client showcase must show the full social-CRM loop offline

## Considered Options

1. CRM contact/interaction/task model in-platform + `MessagingGateway` port (Meta WhatsApp Cloud API + Instagram Messaging, demo gateway records the outbound as an interaction) — one schema, one RBAC; demo-capable; cost: we own the conversation UI
2. Self-host **Chatwoot** (MIT, has WhatsApp + Instagram channels natively) as the support inbox — most capable, mature; cost: Rails + Postgres + Redis + Sidekiq stack (second full platform), separate auth, sync back into orders/loyalty, exceeds the ADR-0016 footprint lesson
3. Unofficial WhatsApp gateways (Baileys/whatsmeow-based) — no Meta verification; ToS-violating risk for a food business with a real customer list; dismissed

## Decision

Option 1. `crm_contact` (email unique, handles for whatsapp/instagram, source, status LEAD|ACTIVE|INACTIVE, tags), `crm_interaction` (channel NOTE|CALL|EMAIL|VISIT|WHATSAPP|INSTAGRAM, direction, body, author from SecurityIdentity), `crm_task` (follow-ups with due date and completion). `MessagingGateway` port: `MetaMessagingGateway` (WhatsApp Cloud API `POST /{phone-number-id}/messages` with `MESSAGING_*` config; Instagram Messaging best-effort) + `DemoMessagingGateway` (records the outbound message as an OUTBOUND interaction on the matching contact). Every interaction is stored regardless of provider — the platform is the system of record; Meta is a transport. Chatwoot (option 2) is the recorded reopen path when a real multi-agent support inbox is needed.

## Consequences

- Migration V17 (crm_contact, crm_interaction, crm_task); `/g/crm/contacts*` management endpoints supersede the read-only 360 list (kept for compatibility)
- Door type: two-way — gateway port swappable; conversation model is provider-independent
- Explicitly deferred: inbound webhook reception (Meta → platform), message templates management, Chatwoot migration path, bulk WhatsApp campaigns (compliance-sensitive — separate decision)
- Reopen trigger: two or more people doing support concurrently, or inbound volume that needs assignment/routing
