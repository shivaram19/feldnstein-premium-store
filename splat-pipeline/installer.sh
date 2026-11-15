#!/usr/bin/env bash
# ONE-SHOT installer for the MC instance: run via `ssh host 'bash -s' < installer.sh`,
# or as the instance launch `command`. Reports milestones to $STATUS_URL
# (the platform's public subscribe endpoint) so progress is observable without
# SSH — set STATUS_URL to the platform base, e.g. https://…onrender.com.
set -euo pipefail
mkdir -p ~/videos ~/work ~/exports ~/tars

report() {
  [ -n "${STATUS_URL:-}" ] || return 0
  curl -fsS -m 15 -X POST "$STATUS_URL/shop/subscribe" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"pipe-$(date -u +%H%M%S)@status.pipeline\",\"name\":\"$1\"}" >/dev/null 2>&1 || true
}
trap 'report "FAILED at line $LINENO"' ERR
report "boot $(hostname) user=$(whoami)"

cat > ~/orchestrate.sh <<'ORCHESTRATE_EOF'
#!/usr/bin/env bash
set -uo pipefail
mkdir -p ~/work ~/exports ~/tars ~/videos
LOG=~/orchestrate.log
exec >>"$LOG" 2>&1
echo "=== orchestrate $(date -u) ==="
if ! command -v colmap >/dev/null; then
  echo "installing colmap/ffmpeg..."
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq colmap ffmpeg curl xz-utils ca-certificates
fi
if ! command -v brush >/dev/null && [ ! -x /opt/brush/bin/brush ]; then
  echo "installing brush..."
  curl -fSL https://github.com/ArthurBrussee/brush/releases/download/v0.3.0/brush-app-x86_64-unknown-linux-gnu.tar.xz -o /tmp/brush.tar.xz
  sudo mkdir -p /opt/brush && sudo tar -xJf /tmp/brush.tar.xz -C /opt/brush
  B=$(find /opt/brush -type f -name 'brush*' -perm -u+x | head -1)
  sudo ln -sf "$B" /usr/local/bin/brush
fi
export PATH="/opt/brush/bin:$PATH"
command -v brush && brush --version 2>/dev/null || true
process() {
  local name="$1" W="$2"
  if [ ! -f "$W/sparse/0/cameras.txt" ] && [ ! -f "$W/sparse/0/cameras.bin" ]; then
    echo "[$name] SfM start $(date -u)"
    rm -f "$W/database.db"
    colmap feature_extractor --database_path "$W/database.db" --image_path "$W/images" \
      --ImageReader.camera_model OPENCV --ImageReader.single_camera 1 \
      --SiftExtraction.use_gpu 0 --SiftExtraction.num_threads "$(nproc)"
    colmap sequential_matcher --database_path "$W/database.db" --SiftMatching.use_gpu 0
    colmap mapper --database_path "$W/database.db" --image_path "$W/images" \
      --output_path "$W/sparse" --Mapper.num_threads "$(nproc)"
    if [ -f "$W/sparse/0/cameras.bin" ]; then
      colmap model_converter --input_path "$W/sparse/0" --output_path "$W/sparse/0" --output_type TXT
    fi
    echo "[$name] SfM done $(date -u): $(ls "$W/sparse/0" 2>/dev/null | tr '\n' ' ')"
  fi
  if [ -f "$W/sparse/0/cameras.txt" ] && ! ls ~/exports/"${name}"_exports/*.ply >/dev/null 2>&1; then
    echo "[$name] train start $(date -u)"
    (cd ~/exports && brush "$W" --total-train-iters 3000 --export-every 1500 \
      --export-path "./${name}_exports/" 2>&1 | tail -40)
    echo "[$name] train done $(date -u): $(ls ~/exports/"${name}"_exports/ 2>/dev/null | tr '\n' ' ')"
  fi
}
for tar in ~/tars/*.tar.gz; do
  [ -e "$tar" ] || continue
  name=$(basename "$tar" .tar.gz)
  if [ ! -d ~/work/"$name"/images ]; then
    echo "unpacking $name"
    mkdir -p ~/work/"$name" && tar xzf "$tar" -C ~/work/"$name"
  fi
  process "$name" ~/work/"$name"
done
for video in ~/videos/*.MP4 ~/videos/*.mp4; do
  [ -e "$video" ] || continue
  name=$(basename "${video%.*}")
  W=~/work/"$name"
  if [ ! -d "$W/images" ]; then
    echo "extracting frames from $video"
    mkdir -p "$W/images"
    ffmpeg -hide_banner -loglevel error -i "$video" -vf "fps=2,scale='min(1920,iw)':-2" \
      -q:v 2 "$W/images/frame_%04d.jpg"
  fi
  process "$name" "$W"
done
echo "=== orchestrate finished $(date -u) ==="
touch ~/ORCHESTRATION-COMPLETE
ORCHESTRATE_EOF
chmod +x ~/orchestrate.sh

cat > ~/remote-bootstrap.sh <<'BOOTSTRAP_EOF'
#!/usr/bin/env bash
set -uo pipefail
mkdir -p ~/videos
if ! command -v gdown >/dev/null; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-pip
  pip3 install --break-system-packages -q gdown
fi
cd ~/videos
for pair in \
  C2703:1ESX6w2PONy0eQy8ZGSfC32Ti2R-j2dTs \
  C2704:1iTETh7u9idzMi9XeDM3y6mT1C3HNZp2n \
  C2705:1geyY0QiLJYUFZOnVXnfBfPoe7rDKpev3 \
  C2706:1aCMoDmmrNCWwGBpKFX6HL_c1QW-bvXuI \
  C2707:1F5PD8PqvuhmNGJPf9zR_YF-lalsPyciX ; do
  name="${pair%%:*}"; id="${pair##*:}"
  if [ ! -f "$name.MP4" ]; then
    echo "downloading $name"
    gdown --fuzzy -q "https://drive.google.com/file/d/$id/view" -O "$name.MP4" || echo "$name download failed"
  fi
done
echo "videos: $(ls -lh ~/videos/*.MP4 2>/dev/null | awk '{print $9, $5}' | tr '\n' ' ')"
bash ~/orchestrate.sh
BOOTSTRAP_EOF
chmod +x ~/remote-bootstrap.sh

nohup ~/remote-bootstrap.sh > ~/bootstrap.log 2>&1 &
echo "PIPELINE-LAUNCHED pid $!"
