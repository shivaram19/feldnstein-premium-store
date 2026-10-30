# Central Media & Content Management — Design Spec

Date: 2026-10-30 · Status: approved design, pending implementation plan
Decisions: storefront fed by admin CMS · S3-compatible object storage (Cloudflare R2 recommended) · auto-resize to slot specs with preview · content scope = products + homepage sections + marketing copy · runtime fetch from API

## Problem

The public storefront (`feldnstein-react`) is fully static: products, photos, hero and section imagery, testimonials, and ticker copy are hardcoded in `src/data/products.js` and bundled images under `public/assets/img`. Every content change requires a developer edit + rebuild. The client needs non-technical staff to upload photos and edit descriptions from the admin, with images automatically conforming to each UI slot's required dimensions.

## Goals

1. Staff upload photos and edit descriptions/copy in `platform-admin` — no code, no rebuild.
2. Every image is auto-cropped/resized to its slot's spec at upload; uploader previews variants before publishing.
3. The storefront renders live content via runtime API calls, with static fallback so it never breaks if the API is down.
4. All of this runs in the existing Quarkus backend + Postgres + admin SPA; no second system to host.

## Non-goals

- Admin SPA's own visuals (login backdrop etc.) — out of scope.
- Video management (AmbientVideo stays as-is).
- Multi-language content.
- Image editing beyond center-crop-to-ratio + resize (no focal-point cropping in v1; alt text is editable).

## Architecture

Approach A — backend-owned content + media pipeline, all inside the existing platform.

```
platform-admin                platform-backend (Quarkus)                R2 (S3)
─────────────                 ──────────────────────────                ────────
Media Library  ──presign──▶  /g/media/presign  ──signed PUT──────────▶  original object
(dropzone)        ◀──asset──  register (DRAFT)                          ▲
Site Content     ──CRUD────▶  async variant worker (crop+resize) ──────┘ variants
editors                    ──▶  Postgres: media_asset / media_variant /
                                 content_block / product_marketing

feldnstein-react (storefront, Pages)
─────────────
ContentContext ──runtime fetch──▶  /site/content, /site/products (public, cached)
                                    └─ unreachable? → bundled static fallback
```

### Storage abstraction

`MediaStorage` interface with two implementations selected by profile:
- **prod**: S3-compatible client (software.amazon.awssdk:s3) against R2 via `endpoint-override`; bucket + credentials from env vars.
- **dev**: local filesystem under `platform-backend/media/` — zero credentials needed for local dev and the client demo.

## Data model (Flyway V8)

```sql
media_asset(
  id, asset_key TEXT UNIQUE NOT NULL,        -- namespaced slot: 'product:groundnut:card', 'hero:main'
  original_filename, content_type, size_bytes,
  alt_text TEXT, status TEXT DEFAULT 'DRAFT', -- DRAFT → READY (variants generated) → PUBLISHED
  created_by TEXT, created_at, updated_at
)

media_variant(
  id, asset_id FK,
  variant_name TEXT,                        -- 'card' | 'hero' | 'banner' | 'thumb'
  width INT, height INT,
  storage_key TEXT                          -- object key / dev file path
)

content_block(
  id, block_key TEXT UNIQUE NOT NULL,       -- 'hero:main', 'collection:banner:1', 'testimonials', 'ticker:items'
  payload TEXT,                             -- JSON (validated by type) or plain text
  updated_by TEXT, updated_at
)

product_marketing(
  id, product_id FK → oil_product,
  badge TEXT, short_desc TEXT, long_desc TEXT,
  card_asset_id FK → media_asset,           -- product card image
  UNIQUE(product_id)
)
```

Slot spec registry (config class, not table, in v1):

| Slot | Ratio | Size | Used by |
|---|---|---|---|
| product card | 4:5 | 800×1000 | storefront product cards, QuickView |
| hero | 16:9 | 1920×1080 | Hero section |
| banner | 21:9 | 1680×720 | collection banners |
| thumb | 4:5 | 200×250 | admin library grid, fallback |

Original is always kept so specs can be regenerated.

## Media pipeline

1. Admin requests presign: `POST /g/media/presign {assetKey, filename, contentType, sizeBytes}` → returns `{uploadUrl, storageKey, assetId}` (asset row created in DRAFT). URL TTL 10 min, single-use intent.
2. Browser PUTs the file direct to R2 (or dev storage URL). The bucket needs a CORS rule allowing `PUT` from the admin/storefront origins (R2 CORS is bucket-level config, part of rollout).
3. Admin confirms upload: `POST /g/media/{id}/finalize` → **verifies the actual object**: size ≤ 10 MB and magic-byte sniffing matches the declared jpeg/png/webp (a presigned PUT pins content-type but not size, so the check must happen here) → mismatch marks the asset ERROR, deletes the object, and returns a friendly 400 → on success, enqueues async variant generation.
4. Worker: fetch original → center-crop to each applicable slot ratio → resize to spec → upload variants → write `media_variant` rows → mark asset `READY` (awaiting publish).
5. Admin previews variants; `POST /g/media/{id}/publish` (or unpublish) flips status.
6. Delete removes variants + original + row (PUBLISHED assets blocked unless unpublished first).

Image library: Thumbnailator (`net.coobird:thumbnailator`) — small, battle-tested, handles crop+resize in one call. Processing runs on a worker thread (Mutiny `runSubscriptionOn`/executor), never on the request thread; max upload 10 MB, mime allowlist `image/jpeg|png|webp`.

## API

**Admin (ADMIN + OPERATOR, under `/g/`):**
- `POST /g/media/presign`, `POST /g/media/{id}/finalize`, `GET /g/media?size=500`, `PUT /g/media/{id}` (alt text, asset_key), `POST /g/media/{id}/publish|unpublish`, `DELETE /g/media/{id}`
- `GET/PUT /g/site-content/{key}` (content blocks, payload validated by block type)
- `GET/PUT /g/product-marketing` + `GET/PUT /g/product-marketing/{productId}`

**Public (no auth, `/site/`):**
- `GET /site/products` — catalog: for each oil product: id, name, sku, prices (from price-configs, SELLING), marketing fields, resolved variant URLs (card + thumb), alt text; only PUBLISHED assets.
- `GET /site/content` — all published content blocks keyed, with resolved media URLs.
- `GET /site/media/{assetKey}` — single asset + variants.
- Response cache headers (`Cache-Control: public, max-age=60, stale-while-revalidate=300` — the standard pattern for public catalog APIs per current HTTP caching guidance); backend in-memory TTL cache (60 s) so R2/DB isn't hit per page view. `/site/*` deliberately excluded from the Basic-auth realm; verify OPTIONS/CORS for the storefront origin. SVG is excluded from the upload allowlist (SVG XSS), so media URLs are safe to serve cross-origin.

## Admin UI (platform-admin)

New nav section **Media & Content** (icon 🖼️), two pages:

1. **Media Library** — thumbnail grid (LazyImage-ish, thumb variants); "Upload" opens a dropzone modal: pick slot (shows ratio + size hint), drag file, progress, then variant preview strip with dimensions; alt-text field; DRAFT/PUBLISHED pill; publish/unpublish/delete actions; filter by slot namespace.
2. **Site Content** — tabbed editors:
   - *Hero*: image slot picker (from library, hero spec) + headline + subcopy
   - *Banners*: per banner slot, image + heading + link
   - *Testimonials*: list editor (quote, author, location) add/remove/reorder
   - *Ticker*: list of headline strings
   - *Products*: per oil — badge, short/long description, card image picker; name/price remain owned by the catalog entities (read-only display here)

All editors follow the existing modal/table/toast patterns (gold primary action, disabled-until-valid, confirm on delete, friendly errors — per the pre-demo UX hardening).

## Storefront (feldnstein-react)

- `ContentContext` provider: on mount, `GET {VITE_SITE_API}/site/content` + `/site/products` with a 5 s timeout; on success, context serves live content; on failure, falls back to the current `products.js` static data (log a console warning). Poll/revalidate on focus optional v1.1 — start with fetch-on-load + manual refresh.
- Components (`Hero`, `CollectionSection`, `ProductsSection`/`MatrixSection`, `TestimonialsSection`, `Ticker`, `QuickViewModal`) read through the context; image `src` prefers live variant URL, falls back to bundled asset.
- Deploy change: storefront becomes the GitHub Pages **root**; platform-admin moves to **`/admin/`** (Vite `base: '/admin/'`, router/base-aware asset paths). The runbook/demo URLs update accordingly. The workflow builds both apps and publishes one Pages artifact.

## RBAC & audit

- Media/content endpoints: ADMIN + OPERATOR (same as inventory suite); public `/site/*` unauthenticated.
- Media publish/unpublish and content edits are audit-logged via the existing `@Audited` interceptor (new actions: `MEDIA_PUBLISH`, `CONTENT_UPDATE`).

## Error handling & edge cases

- Upload without finalize: orphan originals swept by a daily job (v1: on-startup sweep of DRAFT assets older than 24 h with no variants).
- Variant generation failure: asset stays DRAFT with an error note; retry endpoint re-enqueues.
- Content block payload validation: Jackson-typed records per block key; invalid payload → 400 with field message.
- Storefront API down: static fallback (see above) — the site must render identically to today.
- R2 credentials missing in prod: startup probe logs a clear warning; media endpoints return 503 "media storage not configured" instead of failing silently.

## Testing / verification

- Extend `scripts/e2e-business-flows.py`: presign→finalize→variants generated (dev storage), publish gates `/site/products` URLs, content block CRUD round-trip, RBAC sweep additions (anon `/site` OK, `cust` on `/g/media` → 403, upload size/mime rejection).
- Storefront smoke test (`smoke-test.mjs`) extended: render with API mocked (live content) and with API unreachable (fallback).
- Manual: upload a wrong-ratio photo → confirm auto-crop preview; publish → storefront shows it; unpublish → storefront falls back.

## Migration / rollout

1. Backend: V8 migration + entities + storage impls + endpoints + worker.
2. Admin UI: Media & Content section.
3. Storefront: ContentContext + component wiring + fallback.
4. Deploy: env vars (R2) on Render; Pages root swap (storefront) + `/admin/` move; runbook/matrix URL updates.
5. Seed: existing bundled images imported as initial PUBLISHED assets so day-one content matches today's site.

## Internet-resource checks (2026-10-30)

Design validated against current references; two hardening changes adopted above:

- **Presigned PUT enforcement gap** — [files-sdk.dev](https://files-sdk.dev/guides/presigned-upload-validation) and [fast.io](https://fast.io/resources/s3-presigned-url-file-size-limit/): a presigned `PUT` pins content-type but **not** size, so verification must happen at finalize (now step 3). Presigned POST with `content-length-range` policy was the alternative; kept PUT for simplicity.
- **R2 CORS** — [Cloudflare R2 presigned-URL docs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/): browser-direct uploads need a bucket CORS rule allowing PUT from our origins; added to rollout.
- **Short presign TTL** — [Prateeksha](https://prateeksha.com/blog/nextjs-file-uploads-s3-presigned-urls-server-actions-secure-validation): 5–10 min TTL is the recommended norm; spec says 10 min.
- **Cache headers** — [frontend-performance.com SWR blueprint](http://frontend-performance.com/advanced-caching-strategies-cdn-architecture/stale-while-revalidate-implementation/): public catalog APIs → `max-age=60, stale-while-revalidate=300`; adopted.
- **SVG XSS** — [eddyter.com upload guide](https://eddyter.com/blogs/how-to-handle-image-uploads-react-rich-text-editor-2026): SVG is the classic upload XSS vector; our jpeg/png/webp allowlist already excludes it — now noted in the spec.
- **Image library** — Thumbnailator confirmed the standard lightweight JVM choice; imgproxy would add a service to host (rejected, consistent with Approach A).

## Open questions (none blocking)

- R2 vs AWS S3: spec assumes R2 (zero egress cost); the S3 client works with either — only env vars differ.
- Focal-point cropping: v1 center-crop only; revisit if art direction demands it.
