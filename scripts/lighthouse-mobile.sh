#!/usr/bin/env bash
# Run Lighthouse mobile (390x844, slow 4G, CPU 4x slowdown) on the 8 CRM pages
# in production. Requires a session cookie for authenticated pages.
#
# Usage:
#   COOKIE="filmpro_session=<value>" scripts/lighthouse-mobile.sh
#
# Output: notes/audit-mobile-v1-session-D/lighthouse/<page>.json + summary.tsv
#
# How to get COOKIE:
#   1. Login on https://filmpro-crm.vercel.app in Chrome
#   2. DevTools > Application > Cookies > filmpro-crm.vercel.app
#   3. Copy the value of `filmpro_session` (or whichever cookie holds the session)
#   4. Export: export COOKIE="filmpro_session=<paste_here>"
#
# Pages: /, /prospection, /pipeline, /contacts, /entreprises, /signaux, /veille,
#        /reporting, /aide. (login is measured anonymously.)

set -u

BASE="https://filmpro-crm.vercel.app"
OUT="notes/audit-mobile-v1-session-D/lighthouse"
SUMMARY="${OUT}/summary.tsv"
COOKIE="${COOKIE:-}"

PAGES=(
  "login:/login"
  "dashboard:/"
  "prospection:/prospection"
  "pipeline:/pipeline"
  "contacts:/contacts"
  "entreprises:/entreprises"
  "signaux:/signaux"
  "veille:/veille"
  "reporting:/reporting"
  "aide:/aide"
)

mkdir -p "$OUT"
printf 'page\tperf\tlcp_ms\ttbt_ms\tcls\ttti_ms\tfcp_ms\n' > "$SUMMARY"

for entry in "${PAGES[@]}"; do
  name="${entry%%:*}"
  path="${entry#*:}"
  url="${BASE}${path}"
  out="${OUT}/${name}.json"

  extra=()
  if [[ -n "$COOKIE" && "$name" != "login" ]]; then
    extra+=(--extra-headers "{\"Cookie\":\"${COOKIE}\"}")
  fi

  echo "→ Lighthouse mobile: $name ($url)"
  npx --yes lighthouse "$url" \
    --form-factor=mobile \
    --screenEmulation.mobile=true \
    --screenEmulation.width=390 \
    --screenEmulation.height=844 \
    --screenEmulation.deviceScaleFactor=3 \
    --throttling.rttMs=150 \
    --throttling.throughputKbps=1638 \
    --throttling.cpuSlowdownMultiplier=4 \
    --output=json \
    --output-path="$out" \
    --quiet \
    --chrome-flags="--headless=new" \
    "${extra[@]}" 2>/dev/null || { echo "  (failed)"; continue; }

  read -r perf lcp tbt cls tti fcp < <(
    jq -r '[.categories.performance.score,
            .audits["largest-contentful-paint"].numericValue,
            .audits["total-blocking-time"].numericValue,
            .audits["cumulative-layout-shift"].numericValue,
            .audits["interactive"].numericValue,
            .audits["first-contentful-paint"].numericValue]
           | @tsv' "$out"
  )
  printf '%s\t%s\t%.0f\t%.0f\t%s\t%.0f\t%.0f\n' "$name" "$perf" "$lcp" "$tbt" "$cls" "$tti" "$fcp" >> "$SUMMARY"
done

echo
echo "=== Summary ==="
column -t -s $'\t' "$SUMMARY"
