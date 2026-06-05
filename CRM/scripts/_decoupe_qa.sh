#!/usr/bin/env bash
# Découpe Films - barrières QA « tolérance zéro » automatisables (Pascal, 2026-06-05).
# Enchaîne les barrières machine ; sort non-zéro à la PREMIÈRE rouge. Aucune dette tolérée.
# Barrières humaines obligatoires en plus (voir .product-architect/decoupe/qa-tolerance-zero.md) :
#   §7 audit sécu Opus (0 H/C/M)  ·  §8 Lighthouse  ·  §9 fidélité golden ↔ Svelte.
#
# Usage : bash scripts/_decoupe_qa.sh   (depuis CRM/)   ·   --no-e2e pour sauter Playwright.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

RUN_E2E=1
[ "${1:-}" = "--no-e2e" ] && RUN_E2E=0

fail=0
step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
check() { if "$@"; then printf '\033[32mOK\033[0m %s\n' "$*"; else printf '\033[31mECHEC\033[0m %s\n' "$*"; fail=1; fi; }

step "1-3. Tests unitaires (algo + builders + helpers UI)"
check npm test --silent

step "6a. svelte-check (0 erreur attendu)"
check npm run check --silent

step "6b. build prod"
check npm run build --silent

if [ "$RUN_E2E" = 1 ]; then
  step "4-5. e2e Playwright + axe (Découpe)"
  # Convention repo : les e2e Playwright sont en *.test.ts (testMatch playwright.config.ts).
  if [ -f tests/decoupe.test.ts ]; then
    # Session OTP-free fraîche (ne consomme pas le quota OTP) avant le parcours authentifié.
    node tests/mint-session.mjs >/dev/null 2>&1 || printf '\033[33mNOTE\033[0m mint-session a échoué (session existante réutilisée).\n'
    check npx playwright test tests/decoupe.test.ts
  else
    printf '\033[33mNOTE\033[0m tests/decoupe.test.ts absent - à créer (barrière 4-5 non couverte).\n'
    fail=1
  fi
fi

printf '\n========================================\n'
if [ "$fail" = 0 ]; then
  printf '\033[32mTOLERANCE ZERO : barrières machine VERTES.\033[0m\n'
  printf 'Reste obligatoire (manuel) : audit sécu Opus 0 H/C/M · Lighthouse · fidélité golden.\n'
else
  printf '\033[31mTOLERANCE ZERO : au moins une barrière ROUGE - étape NON livrable.\033[0m\n'
fi
exit $fail
