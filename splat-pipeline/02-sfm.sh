#!/usr/bin/env bash
# Step 2 — structure from motion (COLMAP, CPU).
# Consumes <workdir>/images, writes <workdir>/sparse/0 in COLMAP text format
# (the layout Brush consumes: images/ + sparse/0/{cameras,images,points3D}).
# Usage: 02-sfm.sh <workdir> [vcpus]
set -euo pipefail

WORK="${1:?usage: 02-sfm.sh <workdir>}"
NCPU="${2:-$(nproc)}"
IMAGES="$WORK/images"
DB="$WORK/database.db"
SPARSE="$WORK/sparse"

[ -d "$IMAGES" ] || { echo "no $IMAGES — run 01-extract.sh first"; exit 1; }
mkdir -p "$SPARSE"
rm -f "$DB"

echo "== feature extraction (CPU) =="
colmap feature_extractor \
  --database_path "$DB" \
  --image_path "$IMAGES" \
  --ImageReader.camera_model OPENCV \
  --ImageReader.single_camera 1 \
  --SiftExtraction.use_gpu 0 \
  --SiftExtraction.num_threads "$NCPU"

echo "== sequential matching (video frames are ordered) =="
colmap sequential_matcher \
  --database_path "$DB" \
  --SiftMatching.use_gpu 0

echo "== mapper =="
colmap mapper \
  --database_path "$DB" \
  --image_path "$IMAGES" \
  --output_path "$SPARSE" \
  --Mapper.num_threads "$NCPU"

MODEL="$SPARSE/0"
[ -f "$MODEL/cameras.bin" ] || { echo "SfM failed — no sparse model produced"; exit 1; }

echo "== convert to text (Brush/Reality-Scan-style layout) =="
colmap model_converter \
  --input_path "$MODEL" \
  --output_path "$MODEL" \
  --output_type TXT

echo "done: $MODEL ($(grep -c '^' "$MODEL/images.txt" 2>/dev/null || echo '?') images registered)"
