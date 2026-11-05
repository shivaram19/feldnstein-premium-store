# Feldnstein Premium Store Platform

Open-source commerce + operations platform for a bull-driven stone-pressed
(gaanugu) cold-pressed oil business. One monorepo, three deployable apps:

| App | Stack | Path | Deploys to |
|---|---|---|---|
| Storefront | React 18 + Vite + TSX, Tailwind | `feldnstein-react/` | GitHub Pages |
| Admin console | React 18 + Vite + TSX | `platform-admin/` | GitHub Pages (`/admin/`) |
| Backend | Quarkus 3 (Java 21), Hibernate ORM + Panache, Flyway | `platform-backend/` | Render (Docker) |

Database: PostgreSQL in production (Render), H2 in dev and tests.

## What it does

- **Storefront** — brand site + full e-commerce: cart (server-side, token-based),
  GST-aware checkout, Razorpay integration (demo gateway fallback), order
  tracking, newsletter capture, central media/content-driven catalog.
- **Admin console** — inventory (stock levels, FEFO allocation, movements,
  transfers, adjustments, stock counts), production (batches, bulls, presses,
  operators), QC, procurement, alerts, analytics (SVG charts), reports,
  media library, site content editors, price configuration, e-commerce order
  management, **AI marketing assistant** (ADR-0016).
- **Backend** — domain packages under `com.feldnstein.platform`:
  `commerce` (cart / order / payment / fulfilment, DDD with gateway ports),
  `marketing` (LLM + newsletter gateway ports), `gaanugu` (inventory,
  production, QC, procurement, master data), `media` (content + assets).

## Quickstart

```bash
# Backend (:8080) — needs Java 21 + Maven
cd platform-backend && mvn quarkus:dev

# Admin (:5173)
cd platform-admin && npm install && npm run dev

# Storefront (:4173 preview, pointing at local backend)
cd feldnstein-react && npm install
VITE_SITE_API=http://localhost:8080 npm run build && npx vite preview --port 4173
```

Demo accounts (local + live): `admin/admin123`, `ops/ops123`, `cust/cust123`.

## Verify

```bash
python3 scripts/e2e-business-flows.py   # 122 business-flow checks (needs :8080)
node scripts/ui-flow-tests.js           # 44 UX-asserted browser flows (needs all three)
cd uitests && cargo run                 # same 44 flows, independent Rust implementation
cd platform-backend && mvn test         # 37 unit/integration tests
```

## Deployment

- Push to `main` or `premium-redesign` → GitHub Actions deploys storefront +
  admin to Pages and the backend to Render (`render.yaml` blueprints).
- Backend env switches everything live with no code change:
  `PAYMENT_PROVIDER=razorpay` + Razorpay keys,
  `AI_PROVIDER=ollama` + `OLLAMA_BASE_URL`,
  `NEWSLETTER_PROVIDER=listmonk` + Listmonk URL/token.
- Without those, demo providers keep every feature functional offline.

## Engineering doctrine

Decisions are recorded as numbered ADRs in [`docs/decisions/`](docs/decisions/)
(start with ADR-0001 and the doctrine in
[`docs/engineering/first-principles.md`](docs/engineering/first-principles.md)).
Non-trivial contributions must follow the same record-before-implementing rule
(`AGENTS.md`).

## License

[MIT](LICENSE) — © 2026 Shivaram Morigala and contributors.
