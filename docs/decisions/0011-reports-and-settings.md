# 0011. Reports + settings: whitelisted ledger builder, key-value settings

- Status: accepted

## Context

The nav tree includes REPORTS (Standard / Custom Builder / Scheduled) and SETTINGS (General,
Reorder Rules, Expiry Policy, Bull & Press Config, Permissions). Not decided here: self-service
SQL, BI tool integration, email delivery.

## Decision Drivers

- Custom reporting must be safe: admins must never be able to run arbitrary SQL against the DB.
- Scheduled reports must work with zero external infrastructure (no SMTP, no cron daemon).
- Settings must be runtime-editable without a migration per knob, and auditable in meaning.

## Considered Options

1. **Arbitrary SQL report builder** — maximum power, unacceptable injection/exfiltration risk; rejected.
2. **Whitelisted builder over the stock-movement ledger** (fixed table, whitelisted dimensions and
   aggregations, parameterised only by date range/filter values) — safe by construction; chosen.
3. Stored BI tool (Metabase etc.) — external dependency, out of demo scope; deferred.
4. Settings as columns on a singleton row vs typed key-value `app_setting` — singleton forces a
   migration per knob; key-value chosen.

## Decision

Option 2 for reports: standard reports are named SQL-backed endpoints with CSV export; the custom
builder parameterises only group-by dimension, filters, and date range over `stock_movement`.
Scheduled reports: `report_schedule(frequency, next_run)` checked by `@Scheduled`; due schedules
produce `report_run` rows holding the CSV (no email in demo). Settings: `app_setting(key,
value, type, description)` edited from the admin UI; Permissions screen is a read-only role matrix.
AI-drafted; accepted by the project owner.

## Consequences

Easier: safe self-service reporting, CSV everywhere, settings without migrations. Harder: custom
builder is limited to the ledger (documented in the UI; new dimensions need code). Deferred:
cross-table custom reports, email delivery, report caching beyond stored runs.
