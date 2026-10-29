# 0012. Deployment topology: GitHub Pages frontend + containerized backend on Render

- Status: accepted

## Context

The client wants the platform reachable after pushing to GitHub ("deploy at GitHub"). GitHub
Pages hosts static sites only — it cannot run the Quarkus backend or PostgreSQL. Not decided
here: production-grade secrets/SSO, custom domains, HA.

## Decision Drivers

- One git push must result in both tiers updating (CI/CD on GitHub Actions).
- Zero-cost tier acceptable for a demo; cold starts tolerable.
- The admin SPA must reach the backend cross-origin (Pages origin → Render origin) without
  breaking local dev (Vite proxy, same-origin).

## Considered Options

1. **GitHub Pages (frontend) + Render free tier (backend Docker image + managed Postgres)** —
   native GitHub integration, push-to-deploy both tiers; free web tier sleeps on idle, free
   Postgres expires after 30 days (recreate or upgrade for permanence); chosen.
2. Frontend + backend both on a VPS (Oracle free tier etc.) — more setup, no GitHub-native flow.
3. GitHub Actions only ( Pages + GHCR image, manual host) — still needs a host; defers rather than solves.

## Decision

Option 1. GitHub Actions builds the SPA with `VITE_API_BASE` (backend origin) and `VITE_BASE`
(repo subpath) and deploys to GitHub Pages; the same workflow builds the backend image and
pushes it to GHCR; Render (declared in `render.yaml`) deploys that image and a managed Postgres,
wired via `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS` env vars (not a composed JDBC URL — Render's
`fromDatabase` exposes parts). The backend enables CORS for the Pages origin. AI-drafted;
accepted by the project owner.

## Consequences

Easier: one push deploys everything; frontend/backend never drift. Harder: two external
dashboards (Pages settings, Render) need one-time manual setup; demo credentials and CORS
origins are committed config — must be revisited before any real launch. Deferred: custom
domain, TLS pinning, image vulnerability scanning, blue/green.
