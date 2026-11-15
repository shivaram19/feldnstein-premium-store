#!/usr/bin/env bash
# One-time machine setup for the splat pipeline (Ubuntu 24.04 / Debian 13).
# Installs ffmpeg + COLMAP (CPU) and the Brush v0.3.0 prebuilt binary.
set -euo pipefail

echo "== apt packages =="
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg colmap curl xz-utils ca-certificates

echo "== versions =="
ffmpeg -version | head -1
colmap --help 2>/dev/null | head -1 || colmap version || true

echo "== brush binary =="
BRUSH_VER="v0.3.0"
BRUSH_TARBALL="brush-app-x86_64-unknown-linux-gnu.tar.xz"
if [ ! -x /usr/local/bin/brush ]; then
  curl -fSL "https://github.com/ArthurBrussee/brush/releases/download/${BRUSH_VER}/${BRUSH_TARBALL}" -o "/tmp/${BRUSH_TARBALL}"
  mkdir -p /opt/brush && tar -xJf "/tmp/${BRUSH_TARBALL}" -C /opt/brush
  BIN="$(find /opt/brush -type f -name 'brush*' -perm -u+x | head -1)"
  ln -sf "$BIN" /usr/local/bin/brush
  rm -f "/tmp/${BRUSH_TARBALL}"
fi
brush --help | head -12 || echo "brush installed but --help failed (GPU/Vulkan only needed for actual training)"

echo "== done =="
echo "Next: 01-extract.sh <video.mp4> <workdir>"
