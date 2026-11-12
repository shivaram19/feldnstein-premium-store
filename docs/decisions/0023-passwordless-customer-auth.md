# 0023. Customer authentication — passwordless magic-link, post-purchase claim, guest path untouched

- Status: accepted

## Context

The storefront has no customer identity today: carts are anonymous (cart token), checkout takes name/email/phone with no verification, and order tracking + loyalty balance are authorised by an order-code + email pair. The client asked where authentication belongs in the UX given buyer attention span, how many clicks the full purchase should take, and how trust/patience are respected.

Evidence gathered (2026-11-12): Baymard attributes ~18% of checkout abandonment to forced account creation or a hidden guest path, ~17% to a too-long process; the documented fix is guest checkout + passwordless post-purchase account creation (MojoAuth reports 42.7% registration loss eliminated by this pattern; removing forced signup lifts first purchase 15–35%). A minimal checkout is 7–8 true form fields — ours already is 7.

## Decision Drivers

- First-purchase friction is the sacred path: never add a click, field, or login gate to browse → add-to-cart → checkout → pay (currently 5 clicks + 1 form).
- Identity must ride on email, which we already collect and verify implicitly by sending the order confirmation there.
- No passwords to store, reset, or leak; OTP SMS costs money and needs DLT registration in India.
- Two-way door: sessions are opaque tokens; adding OAuth later doesn't conflict.

## Considered Options

1. **Magic link via email, post-purchase claim + optional header sign-in** — zero checkout friction, email ownership proves identity, no credential storage. **Chosen.**
2. OTP via SMS — verified delivery but per-message cost, DLT template registration, phone-first identity that changes when users change numbers. Rejected.
3. Passwords / mandatory registration — 18% abandonment penalty; rejected outright.
4. OAuth (Google/Apple) — good addition later for repeat buyers, but adds a third-party dependency and doesn't verify the *order* email; deferred.

## Decision

Passwordless email magic links. `POST /shop/auth/magic-link` accepts any email (prospecting parity with the newsletter subscribe endpoint) and sends a single-use, 15-minute link through the existing `NewsletterGateway` as a transactional send; `POST /shop/auth/verify` exchanges the link for a 30-day session token sent as `X-Customer-Token`. Orders stay linked to the *email string* — `/shop/me` aggregates orders, spend, loyalty, and the last delivery address by email — so no order-migration FK is needed. A dev-only `GET /shop/auth/dev-link` exposes the pending token for e2e/dev use, enabled only while `newsletter.provider=demo` (never with listmonk). Storefront: confirmation-page claim card ("email me a sign-in link", prefilled with the just-used address), header sign-in/avatar menu, an account view with order history + one-tap reorder, and checkout address prefill when signed in. The guest path is byte-for-byte unchanged. Options and implementation generated with AI tooling; named human owner accountable (§6).

## Consequences

- Repeat purchase drops to ~3 clicks (reorder); first purchase stays at 5 clicks.
- Email deliverability becomes an auth dependency (the link is useless in spam); listmonk/DKIM setup matters before launch.
- Login links are bearer credentials for 15 minutes — rate-limiting `magic-link` requests is a follow-up hardening item.
- Out of scope (deferred): OAuth providers, SMS OTP, saved payment methods, address book management UI.
