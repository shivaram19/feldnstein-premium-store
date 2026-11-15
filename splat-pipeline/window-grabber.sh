#!/usr/bin/env bash
# LOCAL: waits for an SSH window to the MC instance and runs the one-shot installer
# in a SINGLE connection. Repeats until the pipeline is confirmed launched.
set -uo pipefail
IP="64.247.196.11"
KEY="$HOME/.ssh/feldnstein_pipeline"
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG=/tmp/mc-window.log
echo "single-shot grabber started $(date -u)" >>"$LOG"

while true; do
  out=$(ssh -i "$KEY" -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=3 \
      "Ubuntu@$IP" 'bash -s' <"$DIR/installer.sh" 2>/dev/null) || out=""
  if echo "$out" | grep -q "PIPELINE-LAUNCHED"; then
    echo "$(date -u) PIPELINE LAUNCHED: $out" >>"$LOG"
    break
  fi
  # also stop if the remote already has the pipeline running (e.g. launched previously)
  chk=$(ssh -i "$KEY" -o ConnectTimeout=8 "Ubuntu@$IP" \
      'pgrep -f remote-bootstrap >/dev/null && echo RUNNING || true' 2>/dev/null) || chk=""
  if [ "$chk" = "RUNNING" ]; then
    echo "$(date -u) pipeline already running remotely" >>"$LOG"
    break
  fi
  echo "$(date -u) no window yet" >>"$LOG"
  sleep 25
done
