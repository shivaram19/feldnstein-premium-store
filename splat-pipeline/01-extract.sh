#!/usr/bin/env bash
# Step 1 — extract training frames from the mill video.
# Usage: 01-extract.sh <video.mp4> <workdir>
set -euo pipefail

VIDEO="${1:?usage: 01-extract.sh <video.mp4> <workdir>}"
WORK="${2:?usage: 01-extract.sh <video.mp4> <workdir>}"
OUT="$WORK/images"
mkdir -p "$OUT"

# 2 fps + cap the long edge at 1920 (plenty for splats, much faster SfM).
ffmpeg -hide_banner -loglevel error -i "$VIDEO" \
  -vf "fps=2,scale='min(1920,iw)':-2" -q:v 2 \
  "$OUT/frame_%04d.jpg"

echo "extracted $(ls "$OUT" | wc -l) frames to $OUT"
