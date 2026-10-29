#!/usr/bin/env sh
# adr-check.sh — validate the decision log in docs/decisions/
# Usage: sh scripts/adr-check.sh [decisions-dir]   (default: docs/decisions)
set -u

DECISIONS_DIR="${1:-docs/decisions}"
errors=0
records=0

report() {
  echo "ERROR: $1" >&2
  errors=$((errors + 1))
}

if [ ! -d "$DECISIONS_DIR" ]; then
  echo "ERROR: directory $DECISIONS_DIR not found" >&2
  exit 1
fi

found=0
for f in "$DECISIONS_DIR"/[0-9]*.md; do
  [ -e "$f" ] || continue
  found=1
  records=$((records + 1))
  base=$(basename "$f")

  # filename format: NNNN-kebab-title.md
  if ! echo "$base" | grep -Eq '^[0-9]{4}-[a-z0-9-]+\.md$'; then
    report "$f: filename must be NNNN-kebab-title.md"
  fi

  # required sections
  for section in "## Context" "## Decision Drivers" "## Considered Options" "## Decision" "## Consequences"; do
    grep -q "^$section\$" "$f" || report "$f: missing section '$section'"
  done

  # status
  status=$(sed -n 's/^- Status: *//p' "$f" | head -n 1 | tr -d '[:space:]')
  case "$status" in
    proposed|accepted|deprecated|superseded) ;;
    *) report "$f: missing or invalid '- Status:' (got '${status:-none}')" ;;
  esac

  # superseded records must point at an existing successor
  if [ "$status" = "superseded" ]; then
    succ=$(sed -n 's/^- Superseded by: *//p' "$f" | head -n 1 | tr -d '[:space:]')
    if [ -z "$succ" ]; then
      report "$f: status superseded but no '- Superseded by:' line"
    elif ! ls "$DECISIONS_DIR/$succ"-*.md >/dev/null 2>&1; then
      report "$f: superseded by '$succ' but no matching record exists"
    fi
  fi
done

# sequential numbering starting at 0001
expected=1
for f in $(ls "$DECISIONS_DIR"/[0-9]*.md 2>/dev/null | sort); do
  num=$(basename "$f" | cut -c1-4)
  case $num in *[!0-9]*) continue ;; esac
  stripped=$(echo "$num" | sed 's/^0*//')
  [ -n "$stripped" ] || stripped=0
  if [ "$stripped" -ne "$expected" ]; then
    report "$f: expected record number $(printf '%04d' "$expected"), got $num"
  fi
  expected=$((expected + 1))
done

if [ "$found" -eq 0 ]; then
  report "no decision records found in $DECISIONS_DIR"
fi

if [ "$errors" -gt 0 ]; then
  echo "adr-check: FAILED ($errors error(s), $records record(s))" >&2
  exit 1
fi
echo "adr-check: OK ($records record(s))"
