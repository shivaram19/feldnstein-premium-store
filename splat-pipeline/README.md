# Gaussian Splat Pipeline — Feldnstein Mill Tour

Free, open-source pipeline turning a phone video of the Mothadaka mill into an
interactive 3D splat embedded on the storefront ("Tour the mill in 3D").

**Chain:** phone video → ffmpeg (frames) → COLMAP (structure-from-motion) →
[Brush](https://github.com/ArthurBrussee/brush) (Gaussian training, free) →
[SuperSplat](https://playcanvas.com/supersplat/editor) (edit/measure/publish) → `.ply`

This replaces the video's Windows-only Reality Scan step (frame extraction +
SfM) with the equivalent free Linux tools — same COLMAP output Brush consumes.

## Machine roles

| Step | Tool | Runs on |
|---|---|---|
| 1. Frame extraction (~2 fps) | `ffmpeg` | any box (even this laptop) |
| 2. Structure from motion | `colmap` (CPU, 10–40 min for ~100 frames) | CPU cloud box or the GPU pod |
| 3. Gaussian training | `brush` v0.3.0 prebuilt binary | **GPU required** — see below |
| 4. Edit / measure / publish | SuperSplat | browser |

DigitalOcean has **no GPU droplets** on this account (H100 early-access only), so:

- **Option A (recommended, cheapest):** one ephemeral GPU pod at RunPod or
  Vast.ai does steps 1–3 in a single sitting (~₹60–120 for a 2–3 hr session on
  an RTX 3090-class pod at $0.20–0.35/hr), then you download the `.ply` and
  terminate. Nothing runs between sessions.
- **Option B:** a small DO droplet as an always-available hub for steps 1–2
  (`s-4vcpu-8gb` ≈ $0.071/hr) + a GPU pod only for training. Needs doctl
  **write** auth (see "Unblock").

## Unblock: doctl is read-only in this session

`doctl auth login` here was granted read scope — droplet/key creation returns
403. Either:

1. Re-authenticate with write scope: `doctl auth login` in a terminal, choose
   **read + write**; or
2. Create a personal access token at
   https://cloud.digitalocean.com/account/api/tokens (read+write) and:
   `doctl auth init -t <token>`

Then say the word and the droplet gets created with `setup-droplet.sh`.

## Option A runbook (GPU pod, no DO needed)

1. **Shoot the mill** (see below), copy the video to this laptop.
2. Rent a pod: RunPod → community cloud → RTX 3090 (~$0.34/hr) or
   Vast.ai → RTX 3090 (~$0.20–0.30/hr). Any image with Ubuntu 24.04 works.
3. From this repo:
   ```bash
   scp -r splat-pipeline/ root@<pod-ip>:~/
   ssh root@<pod-ip>
   bash splat-pipeline/setup-droplet.sh        # ffmpeg + colmap + brush
   bash splat-pipeline/01-extract.sh /path/mill.mp4 ~/mill
   bash splat-pipeline/02-sfm.sh ~/mill
   bash splat-pipeline/03-train.sh ~/mill      # ~3000 iters, exports .ply
   ```
4. Download `mill_exports/export-*.ply`, terminate the pod.
5. Open https://playcanvas.com/supersplat/editor → File → Import → clean up
   floaters (sphere-select → invert → delete, per the video) → Export `.ply`.
6. Store in the store's media system (admin → media → upload) and embed —
   see "Embedding on the storefront".

## Shooting guide for the Mothadaka mill (splat quality lives or dies here)

- **Bulls resting, press idle.** Moving subjects become ghost-blobs; a rotating
  stone churner is worse. Static scene = clean splat.
- One slow **walk-around orbit** of the press: 40–60s, phone horizontal at
  chest height, steady, overlapping coverage from multiple heights if possible.
  No zoom punches, no fast turns.
- Good diffuse daylight; avoid harsh noon shadows moving across the scene.
- Keep people out of frame.
- 2 fps × 50s ≈ 100 frames — ideal for sequential SfM matching.

## Embedding on the storefront

The finished `.ply` slots into the existing media-management system (ADR: media
pipeline): upload via admin → served at `/site/media/file/{key}` → embed with
the Brush web viewer (`?url=`) or a three.js splat component in a
"Tour the Mill in 3D" home-page section. Implementation is a separate step once
a real `.ply` exists — the section ships with a graceful poster fallback.

## Verified facts (2026-11-15)

- Brush v0.3.0 prebuilt Linux binary exists on GitHub releases
  (`brush-app-x86_64-unknown-linux-gnu.tar.xz`); CLI takes the dataset path
  positionally and trains headless: `--total-train-iters`,
  `--export-path`, `--export-every`.
- Brush consumes a standard COLMAP layout: `images/` + `sparse/0/`
  (cameras/images/points3D, bin or txt).
- 3,000 iters is a sensible quality/time balance (the video's own advice:
  diminishing returns past ~7,000).
