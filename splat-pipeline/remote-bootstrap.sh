#!/usr/bin/env bash
# Runs on the MC instance (invoked via one short SSH window).
# Downloads the human-free mill clips from the shared Drive folder, then runs
# the full extract -> SfM -> train pipeline via orchestrate.sh.
set -uo pipefail
mkdir -p ~/videos

if ! command -v gdown >/dev/null; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-pip
  pip3 install --break-system-packages -q gdown
fi

cd ~/videos
# name:fileId from the shared folder (C2708 excluded — humans visible)
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
echo "videos present: $(ls -lh ~/videos/*.MP4 2>/dev/null | awk '{print $9, $5}' | tr '\n' ' ')"

bash ~/orchestrate.sh
