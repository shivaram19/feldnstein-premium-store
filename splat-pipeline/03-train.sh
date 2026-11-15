#!/usr/bin/env bash
# Step 3 — Gaussian training with Brush (needs a GPU/Vulkan machine).
# Usage: 03-train.sh <workdir> [iters]
set -euo pipefail

WORK="${1:?usage: 03-train.sh <workdir>}"
ITERS="${2:-3000}"
[ -d "$WORK/sparse/0" ] || { echo "no $WORK/sparse/0 — run 02-sfm.sh first"; exit 1; }

# Headless train; exports a .ply every 500 iters into <workdir>_exports/.
brush "$WORK" \
  --total-train-iters "$ITERS" \
  --export-every 500 \
  --export-path "./$(basename "$WORK")_exports/"

echo "exports in $(dirname "$WORK")/$(basename "$WORK")_exports/"
ls -lh "$(dirname "$WORK")/$(basename "$WORK")_exports/" | tail -5
echo "next: open the final .ply in SuperSplat, clean floaters, export for the site"
