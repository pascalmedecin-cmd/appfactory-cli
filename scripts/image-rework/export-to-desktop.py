#!/usr/bin/env python3
"""
Dépose sur Desktop :
- diagram-films-solaires-marges.png : diagramme avec grandes marges blanches autour,
  pour que Pascal y insère son soleil manuellement et crop après
- sun-transparent.png : soleil détouré PNG transparent

Pas d'appel fal.ai (utilise les fichiers déjà générés).
"""

import shutil
from pathlib import Path

from PIL import Image

OUTPUT_DIR = Path(__file__).parent / "output"
DESKTOP = Path.home() / "Desktop"

DIAGRAM_SOURCE = OUTPUT_DIR / "diagram-edit-v2.png"
SUN_TRANSPARENT = OUTPUT_DIR / "sun-transparent-v1.png"

# Marge blanche tout autour (haut, bas, gauche, droite)
MARGIN = 600


def main():
    if not DIAGRAM_SOURCE.exists():
        raise SystemExit(f"Diagramme source introuvable : {DIAGRAM_SOURCE}")
    if not SUN_TRANSPARENT.exists():
        raise SystemExit(f"Soleil détouré introuvable : {SUN_TRANSPARENT}")

    # Diagramme avec grandes marges blanches
    diagram = Image.open(DIAGRAM_SOURCE).convert("RGBA")
    new_w = diagram.width + 2 * MARGIN
    new_h = diagram.height + 2 * MARGIN
    canvas = Image.new("RGBA", (new_w, new_h), (255, 255, 255, 255))
    canvas.paste(diagram, (MARGIN, MARGIN))

    diagram_out = DESKTOP / "diagram-films-solaires-marges.png"
    canvas.save(diagram_out)
    print(f"  diagramme avec marges : {diagram_out} ({new_w}x{new_h}, marge {MARGIN}px partout)")

    # Soleil détouré (copie directe)
    sun_out = DESKTOP / "sun-transparent.png"
    shutil.copy(SUN_TRANSPARENT, sun_out)
    print(f"  soleil transparent    : {sun_out}")

    print("\nFichiers prêts sur le Desktop pour montage manuel.")


if __name__ == "__main__":
    main()
