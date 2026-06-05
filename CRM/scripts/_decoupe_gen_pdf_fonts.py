#!/usr/bin/env python3
"""Génère src/lib/decoupe/pdf-fonts.ts (polices TTF base64 pour l'export PDF Découpe Films).

Pourquoi : jsPDF embarque des polices au format TTF, mais @fontsource ne livre que du
woff/woff2. On convertit les .woff (sous-ensemble latin, légers) déjà installés en TTF via
fonttools, puis on encode en base64 dans un module TS chargé en lazy (hors bundle initial).

svg2pdf ne distingue que normal / bold (poids >= 700) → on embarque uniquement :
  - DM Sans 400 (normal) + 700 (bold),
  - DM Mono 400 (normal).
La hiérarchie typographique du PDF se fait via bold/normal (pas de 500/600).

Reproductible : `python3 scripts/_decoupe_gen_pdf_fonts.py` (depuis CRM/).
"""
from __future__ import annotations

import base64
import io
import pathlib
import sys

from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = {
    "DMSANS_400": ROOT / "node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff",
    "DMSANS_700": ROOT / "node_modules/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff",
    "DMMONO_400": ROOT / "node_modules/@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff",
}
OUT = ROOT / "src/lib/decoupe/pdf-fonts.ts"


def woff_to_ttf_base64(path: pathlib.Path) -> str:
    if not path.exists():
        sys.exit(f"Police introuvable : {path} (npm i -D @fontsource/dm-sans @fontsource/dm-mono)")
    font = TTFont(path)  # auto-détecte le flavor woff
    font.flavor = None  # -> sfnt (TTF) brut
    buf = io.BytesIO()
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> None:
    entries = {name: woff_to_ttf_base64(p) for name, p in SRC.items()}
    lines = [
        "// GÉNÉRÉ par scripts/_decoupe_gen_pdf_fonts.py - NE PAS ÉDITER À LA MAIN.",
        "// Polices TTF base64 (sous-ensemble latin) embarquées dans jsPDF pour l'export PDF",
        "// Découpe Films. Chargé en lazy (dynamic import) → hors bundle initial.",
        "/* eslint-disable */",
        "/* prettier-ignore */",
    ]
    for name, b64 in entries.items():
        lines.append(f"export const {name}: string = '{b64}';")
    lines.append("")
    OUT.write_text("\n".join(lines), encoding="utf-8")
    sizes = ", ".join(f"{n}={len(b)//1024}Ko" for n, b in entries.items())
    print(f"Écrit {OUT.relative_to(ROOT)} ({sizes} base64)")


if __name__ == "__main__":
    main()
