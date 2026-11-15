#!/usr/bin/env bash
# Massed Compute REST driver for the splat pipeline.
# Token resolution order: $MC_TOKEN env, ~/.config/massedcompute/token, then this file's sibling token file.
set -euo pipefail

API="https://vm.massedcompute.com/api/v1"
TOKEN="${MC_TOKEN:-}"
[ -z "$TOKEN" ] && [ -f ~/.config/massedcompute/token ] && TOKEN="$(cat ~/.config/massedcompute/token)"
[ -z "$TOKEN" ] && [ -f "$(dirname "$0")/.mc-token" ] && TOKEN="$(cat "$(dirname "$0")/.mc-token")"
if [ -z "$TOKEN" ]; then
  echo "no token: export MC_TOKEN or put it in ~/.config/massedcompute/token" >&2
  exit 1
fi

mc() { # mc <METHOD> <path> [json-body]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -fsSL -X "$method" "$API$path" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$body"
  else
    curl -fsSL -X "$method" "$API$path" -H "Authorization: Bearer $TOKEN"
  fi
}

case "${1:-help}" in
  validate)   mc POST /account/token/validation ;;
  balance)    mc GET /account/billing | python3 -m json.tool ;;
  inventory)  mc GET /gpu-inventory ;;
  images)     mc GET /images | python3 -m json.tool ;;
  instances)  mc GET /instance | python3 -m json.tool ;;
  add-key)    # add-key <name> <pubkey-file>
              mc POST /ssh-keys "{\"name\":\"$2\",\"publicKey\":\"$(cat "$3")\"}" | python3 -m json.tool ;;
  launch)     # launch <productName> <imageId> <name> [sshkey-name]
              mc POST /instance/launch "{\"productName\":\"$2\",\"imageId\":$3,\"regionName\":\"any\",\"instanceName\":\"$4\",\"sshKeys\":[${5:+\"$5\"}]}" | python3 -m json.tool ;;
  terminate)  # terminate <uuid>
              mc POST /instance/terminate "{\"instanceUuids\":[\"$2\"]}" | python3 -m json.tool ;;
  *) echo "usage: mc.sh validate|balance|inventory|images|instances|add-key|launch|terminate" >&2; exit 2 ;;
esac
