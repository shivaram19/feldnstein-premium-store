# 0026. Mill-tour 3D viewer — three.js native GaussianSplat (r186+)

- Status: accepted

## Context

The Gaussian splat pipeline produced `C2703.ply` (4.3MB, 19,091 splats — the
Mothadaka mill shed captured on video). The business ask: recreate the shed,
its environment, and navigable motion on the storefront as a "Tour the Mill
in 3D" experience, using a viewer framework from the three.js developers'
own ecosystem. What is NOT being decided: splat training/cleanup tooling
(covered by the ad-hoc pipeline; ADR-worthy only if it becomes a product
feature), and whether to convert the asset to SPZ (deferred, see Consequences).

## Decision Drivers

- **Provenance** — user directive: use implementations from the three.js
  developers themselves, not third-party viewers.
- **Trust-first UX / attention economy** — the viewer must not tax page load
  or mobile patience; 3D starts only on explicit intent.
- **Longevity** — engine-native APIs outlive community add-ons.
- **Bundle weight** — storefront is a Vite/React SPA; three.js is a new,
  heavy dependency that must load lazily.

## Considered Options

1. **three.js native `GaussianSplat` + `GaussianSplatPLYLoader` (r186+)** —
   first-party, `GaussianSplat` extends `THREE.Mesh`, PLY loads directly,
   WebGPURenderer with WebGL2 backend fallback. Weakness: needs three ≥ r186
   as a new dependency; WebGL2 fallback path must be verified per-browser.
2. **`@mkellogg/gaussian-splats-3d`** — the mature community standard
   (WebGL2, works on older three); weakness: third-party, duplicates what
   r186 made native, KSPLAT-centric.
3. **Gaussian Splat Lite / PlayCanvas SuperSplat embed** — WebGPU streaming
   and editing respectively; weakness: heaviest option, editing is out of
   scope, SuperSplat is a different engine.
4. Do nothing — the .ply sits on disk; the mill-tour story never reaches the
   site; marketing value of the pipeline spend is zero.

## Decision

Option 1: three.js r186+ native Gaussian splat support, consuming the raw
`.ply` via `GaussianSplatPLYLoader`. First-party provenance (the user's core
directive), zero format conversion, and the smallest conceptual surface
(loader → mesh → scene). Evidence from the r186 announcement and API
write-up ([radiancefields.com/platforms/three-js](https://radiancefields.com/platforms/three-js),
[ben3d.ca how-to](https://ben3d.ca/blog/how-to-use-threejs-native-gaussian-splats));
options enumerated with AI assistance, decision owned by the human.

## Consequences

- The viewer is a **click-to-load island**: poster frame + title render with
  the page; `three/webgpu`, the loader, and the 4.3MB `.ply` load only on
  interaction (dynamic `import()`), keeping home-page weight unchanged.
- Motion: gentle auto-orbit (`OrbitControls.autoRotate`) that pauses on user
  interaction — the "walking around the shed" feel without forcing it.
- Fallback ladder: WebGPU → WebGL2 backend (`forceWebGL`) → poster stays with
  an explanatory note. No device is left with a dead rectangle.
- Asset ships in `public/assets/splats/` (deployed with the site, no external
  host dependency); catbox/GitHub-release copies remain as mirrors only.
- SPZ v4 conversion (smaller/faster) is deferred until the asset count grows;
  at 4.3MB the gain is negligible. Two-way door: swap loader later.
- If r186+ GaussianSplat proves unstable on the WebGL2 fallback for real
  users, reopen and consider option 2 (community fallback).

## Amendments

- 2026-11-19: Asset iterated after visual verification — the 3,000-step splat
  (19,091 splats) rendered as translucent fog; retrained at 10,000 steps
  (44,422 splats, 10MB). Pipeline hardening from the same iteration: export
  selection by file SIZE with a >1MB gate (Brush can leave a torn newest file
  — a 2-splat stub was uploaded once), and viewer framing via percentile
  bounding box + interior eye-level entry (raw bounding sphere is
  outlier-inflated). Outlier filter at import time drops log-scale > 3.5 and
  opacity logit < -3.5 (19,091 → 16,774 on the 3k asset; 44,422 → 40,458 on
  the 10k asset). SwiftShader (software WebGPU) renders the scene smudgy;
  real GPUs render it crisp — accepted for the demo, SuperSplat pass remains
  the cleanup path if the asset bothers anyone.
- 2026-11-25: Section removed from the storefront at user request (nav link,
  home-section mount, and shipped assets taken out; component sources under
  `src/components/tour/` and the splat under `~/splat-work/` retained for
  easy reinstatement). Record stands as the decision trail if the tour returns.
