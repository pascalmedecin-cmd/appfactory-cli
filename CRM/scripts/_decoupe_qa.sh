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
  step "4-5. e2e Playwright + axe (Découpe) + export PDF (svg2pdf donut)"
  # Convention repo : les e2e Playwright sont en *.test.ts (testMatch playwright.config.ts).
  #   tests/decoupe.test.ts      : parcours UI + axe + bouton export → PDF réel téléchargé.
  #   tests/decoupe-pdf.test.ts  : svg2pdf rend le donut (cercle + arc) sur le PDF généré.
  if [ -f tests/decoupe.test.ts ] && [ -f tests/decoupe-pdf.test.ts ]; then
    # Déterminisme : la 1re navigation vers une route Découpe déclenche la compilation Vite à froid
    # (peut dépasser le timeout `networkidle` 30 s du test). On préchauffe le serveur dev AVANT
    # Playwright (qui le réutilise via reuseExistingServer:true). On ne tue que ce qu'on a démarré.
    STARTED_DEV=0
    if ! curl -sf -o /dev/null http://localhost:5173/ 2>/dev/null; then
      npm run dev >/tmp/_decoupe_qa_dev.log 2>&1 &
      DEV_PID=$!
      STARTED_DEV=1
      for _ in $(seq 1 60); do curl -sf -o /dev/null http://localhost:5173/ 2>/dev/null && break; sleep 1; done
    fi
    printf 'préchauffage routes Découpe (compile Vite)...\n'
    for r in /decoupe /decoupe/produits /decoupe/optimisation; do
      curl -s -o /dev/null --max-time 90 "http://localhost:5173$r" || true
    done
    # Session OTP-free fraîche (ne consomme pas le quota OTP) avant le parcours authentifié.
    node tests/mint-session.mjs >/dev/null 2>&1 || printf '\033[33mNOTE\033[0m mint-session a échoué (session existante réutilisée).\n'
    check npx playwright test tests/decoupe.test.ts tests/decoupe-pdf.test.ts
    [ "$STARTED_DEV" = 1 ] && kill "$DEV_PID" 2>/dev/null
  else
    printf '\033[33mNOTE\033[0m tests/decoupe*.test.ts manquant(s) - barrière 4-5 non couverte.\n'
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
