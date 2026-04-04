#!/bin/bash
# Hook SessionStart — injecte context.md au demarrage

if [ -f "context.md" ]; then
  cat context.md
else
  echo "context.md introuvable — rien a afficher."
fi

exit 0
