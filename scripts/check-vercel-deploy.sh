#!/usr/bin/env bash
# Watch GitHub commit status for Vercel deployment after a push.
# Notifies via osascript on failure/error.
#
# Usage: scripts/check-vercel-deploy.sh <commit_sha> [repo_full_name]
#   commit_sha: full or short SHA of the pushed commit
#   repo_full_name: owner/repo (default: pascalmedecin-cmd/appfactory-cli)
#
# Polls every 20s, max 6 min. Source of truth: GitHub commit status API
# (Vercel pushes a "Vercel" context with state pending/success/failure/error).

set -u

SHA="${1:-}"
REPO="${2:-pascalmedecin-cmd/appfactory-cli}"
LOG="${HOME}/.claude/logs/vercel-deploy-watch.log"
MAX_ATTEMPTS=18   # 18 * 20s = 6 min
INTERVAL=20

if [[ -z "$SHA" ]]; then
  echo "usage: $0 <commit_sha> [repo_full_name]" >&2
  exit 2
fi

mkdir -p "$(dirname "$LOG")"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"
}

notify() {
  local title="$1"
  local body="$2"
  osascript -e "display notification \"${body//\"/\\\"}\" with title \"${title//\"/\\\"}\"" 2>/dev/null || true
}

log "watch start sha=$SHA repo=$REPO"

last_state=""
target_url=""
description=""

for ((i=1; i<=MAX_ATTEMPTS; i++)); do
  # Capture only the Vercel context status (there can be many statuses)
  json=$(gh api "repos/${REPO}/commits/${SHA}/status" 2>/dev/null || echo '{}')
  vercel_status=$(printf '%s' "$json" | jq -r '
    (.statuses // [])
    | map(select(.context == "Vercel"))
    | sort_by(.updated_at) | reverse
    | .[0]
    | "\(.state // "none")|\(.target_url // "")|\(.description // "")"
  ' 2>/dev/null || echo "none||")

  state="${vercel_status%%|*}"
  rest="${vercel_status#*|}"
  target_url="${rest%%|*}"
  description="${rest#*|}"

  if [[ "$state" != "$last_state" ]]; then
    log "tick $i/$MAX_ATTEMPTS state=$state desc=\"$description\""
    last_state="$state"
  fi

  case "$state" in
    success)
      log "OK sha=$SHA url=$target_url"
      exit 0
      ;;
    failure|error)
      log "FAIL sha=$SHA state=$state desc=\"$description\" url=$target_url"
      notify "Vercel deploy FAILED" "${SHA:0:7} ${state}: ${description} — ${target_url}"
      exit 1
      ;;
    pending|none|"")
      ;;
    *)
      log "unknown state=$state"
      ;;
  esac

  sleep "$INTERVAL"
done

log "TIMEOUT sha=$SHA last_state=$last_state url=$target_url"
notify "Vercel deploy TIMEOUT" "${SHA:0:7} stuck in ${last_state:-no-status} after 6 min"
exit 3
