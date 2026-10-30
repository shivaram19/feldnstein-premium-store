# 0013. Central media & content management: backend-owned, S3-compatible storage

- Status: accepted

## Context

The storefront (`feldnstein-react`) is fully static: products, photos, hero/section imagery,
testimonials, and ticker copy are hardcoded in `src/data/products.js` and bundled images. Every
content change needs a developer edit + rebuild. The client needs non-technical staff to upload
photos and edit descriptions from the admin, with images automatically conforming to each UI
slot's dimensions ("correct measurements falling into place").

## Decision Drivers

- Non-technical staff must publish photos/copy without code or rebuilds.
- Images must be auto-cropped/resized to slot specs at upload time.
- No second system to host or secure (no headless CMS service).
- Works on the free deployment tier; local demo must run with zero cloud credentials.
- Storefront must never break when the content API is unreachable.

## Considered Options

1. **Backend-owned content + media pipeline in the existing Quarkus app** — new Flyway tables
   (`media_asset`, `media_variant`, `content_block`, `product_marketing`), presigned direct
   upload to S3-compatible storage, scheduled variant worker (Thumbnailator), public read-only
   `/site/*` endpoints; admin SPA gets a Media & Content section; storefront fetches at runtime
   with static fallback. Chosen.
2. **Headless CMS (Strapi/Payload/Contentful)** — richer editor, but a second service, second
   database, and separate auth to host and harden. Rejected as overweight for a 4-product
   catalog plus a handful of homepage blocks.
3. **Git-backed CMS (Decap)** — contradicts the runtime-fetch requirement; every publish needs
   a rebuild and a git commit from staff. Rejected.

## Decision

Option 1, per the approved spec `docs/superpowers/specs/2026-10-30-media-management-design.md`.
Storage is behind a `MediaStorage` abstraction with two implementations selected by
`media.storage.type`: local disk (dev/demo, zero credentials) and S3-compatible (production,
targeting Cloudflare R2; any S3 API works since only env vars differ). Media bytes are served
through the backend at `/site/media/file/{key}` using content-addressed keys and immutable
cache headers, rather than public bucket URLs — one less piece of bucket config to get right.
Content blocks store resolved image URLs (inserted by admin pickers), keeping the public
read model a plain JSON map. Simplifications accepted: every asset generates all four slot
variants (card 4:5, hero 16:9, banner 21:9, thumb 4:5) and v1 crops center-only.

## Consequences

- Upload flow is presign → direct PUT → finalize with size + magic-byte verification →
  async variant generation → publish gate (DRAFT → READY → PUBLISHED). A presigned PUT pins
  content-type but not size, so verification at finalize is mandatory.
- R2 bucket needs a CORS rule allowing PUT from the app origins (rollout checklist item).
- Public `/site/*` endpoints are unauthenticated with `max-age=60, stale-while-revalidate=300`;
  the storefront falls back to its bundled static content if the API is unreachable.
- R2 credentials enter production via `MEDIA_S3_*` env vars (Render dashboard); until set, media
  admin endpoints fail loudly rather than silently.
- Publish/unpublish and content edits are audit-logged (`MEDIA_PUBLISH`, `MEDIA_DELETE`,
  `CONTENT_UPDATE`).
