# 0016. AI-native marketing layer — provider-fallback architecture

- Status: accepted

## Context

The platform needs AI marketing capability (copy generation, newsletter capture) without committing to paid SaaS or heavyweight self-hosted stacks before there is usage evidence. The machine and Render free tier cannot honestly run multi-container analytics/marketing platforms. The repo already proved a provider-fallback pattern for payments (ADR family around the Razorpay gateway: `PAYMENT_PROVIDER=razorpay|demo`, demo mode fully functional without keys).

## Decision Drivers

- Zero-cost launch; no per-contact or per-execution pricing (§3.8 evidence over intuition — no traffic evidence exists yet)
- Self-hostability and data ownership (customer emails must not leave our infrastructure silently)
- Graceful degradation: every AI feature must work in demo mode for the client showcase (§3.2 YAGNI — build the port, not every provider)
- Consistency with the existing gateway-port architecture (payments set the precedent)

## Considered Options

1. Provider-fallback ports (`AI_PROVIDER=ollama|demo`, `NEWSLETTER_PROVIDER=listmonk|demo`) — matches payments pattern; demo mode needs no external process; one env-var flip goes live; weakness: demo copy is templated, not truly generative
2. Direct n8n/Activepieces deployment as the marketing hub — most capable; but needs an always-on worker + queue + secrets before there is a single campaign to run; multi-container footprint exceeds the free tier and this laptop honestly
3. Mautic full marketing suite — heaviest option; email automation we don't yet send; reopens the "presumptive features" failure mode
4. Do nothing — storefront subscription form stays decorative; no AI assist in content editing

## Decision

Option 1. Two new ports in a `marketing` package: `LlmGateway` (Ollama via its OpenAI-compatible API; demo gateway renders brand-voice templates) and `NewsletterGateway` (Listmonk REST API; demo gateway persists subscribers to a local `subscriber` table, migration V13). Content generation is exposed as `POST /g/marketing/generate` (admin), subscriber capture as `POST /shop/subscribe` (public, idempotent), subscriber list as `GET /g/marketing/subscribers`. Providers are live-switched purely by env var, no code change — same contract as the Razorpay decision. Options and shortlist came from internet research + AI agents; the human owner remains accountable.

## Consequences

- Demo mode works offline today; `AI_PROVIDER=ollama` + `OLLAMA_BASE_URL` and `NEWSLETTER_PROVIDER=listmonk` + `LISTMONK_BASE_URL`/`LISTMONK_API_TOKEN` go live on Render with env vars only
- Deferred (reopen when evidence appears): Gorse-style recommender (needs interaction volume we don't have), PostHog-class analytics (separate ADR), Razorpay-webhook-triggered lifecycle emails, partial refund flows
- Door type: two-way — providers are swappable ports; the demo gateways must remain functional as offline fallback
- Evidence that reopens: real subscriber count > 0 sustained for a month, or client requests automated campaigns
