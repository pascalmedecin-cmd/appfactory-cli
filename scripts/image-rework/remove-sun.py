#!/usr/bin/env python3
"""
Retire le soleil tronqué du diagramme (zone haut-gauche en blanc).

Source : scripts/image-rework/output/diagram-edit-v2.png
Output : scripts/image-rework/output/diagram-no-sun-v{N}.png + preview HTML

Coût : $0 (local).

Pour ajuster la zone : modifier ZONE_X2, ZONE_Y2 ci-dessous.

Usage : python3 scripts/image-rework/remove-sun.py
"""

import base64
import os
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

OUTPUT_DIR = Path(__file__).parent / "output"
SOURCE_IMAGE = OUTPUT_DIR / "diagram-edit-v2.png"

# Zone à blanchir (coin haut-gauche). Image source = 2752 x 1536.
ZONE_X1 = 0
ZONE_Y1 = 0
ZONE_X2 = 800
ZONE_Y2 = 550


def next_version() -> int:
    pattern = re.compile(r"^diagram-no-sun-v(\d+)\.png$")
    versions = []
    for f in OUTPUT_DIR.iterdir():
        m = pattern.match(f.name)
        if m:
            versions.append(int(m.group(1)))
    return max(versions) + 1 if versions else 1


def image_to_data_url(path: Path) -> str:
    data = path.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:image/png;base64,{b64}"


def main():
    if not SOURCE_IMAGE.exists():
        raise SystemExit(f"Source introuvable : {SOURCE_IMAGE}")

    img = Image.open(SOURCE_IMAGE).convert("RGBA")
    print(f"  source : {SOURCE_IMAGE.name} ({img.width}x{img.height})")

    draw = ImageDraw.Draw(img)
    draw.rectangle([ZONE_X1, ZONE_Y1, ZONE_X2, ZONE_Y2], fill=(255, 255, 255, 255))
    print(f"  zone blanchie : ({ZONE_X1},{ZONE_Y1}) → ({ZONE_X2},{ZONE_Y2})")

    version = next_version()
    out_path = OUTPUT_DIR / f"diagram-no-sun-v{version}.png"
    img.save(out_path)
    print(f"  sauvegardé : {out_path.name}")

    # HTML preview avec rectangle indicatif sur l'aperçu source
    src_url = image_to_data_url(SOURCE_IMAGE)
    res_url = image_to_data_url(out_path)

    # Calcul du rectangle en pourcentages pour overlay CSS
    pct_w = ZONE_X2 / img.width * 100
    pct_h = ZONE_Y2 / img.height * 100

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Diagramme sans soleil : v{version}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; line-height: 1.5; }}
  h1 {{ font-size: 20px; margin-bottom: 4px; }}
  .meta {{ color: #94a3b8; font-size: 13px; margin-bottom: 20px; }}
  .meta strong {{ color: #cbd5e1; }}
  .compare {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }}
  .panel {{ background: #1e293b; border-radius: 10px; padding: 12px; }}
  .panel h2 {{ font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }}
  .panel-img {{ position: relative; width: 100%; }}
  .panel img {{ width: 100%; height: auto; border-radius: 6px; display: block; background: #fff; }}
  .zone-overlay {{ position: absolute; top: 0; left: 0; width: {pct_w}%; height: {pct_h}%; border: 3px dashed #f43f5e; background: rgba(244,63,94,0.15); border-radius: 4px; pointer-events: none; }}
  .cta {{ background: #134e4a; border: 1px solid #14b8a6; border-radius: 10px; padding: 16px; color: #ccfbf1; font-size: 14px; }}
  .cta strong {{ color: #5eead4; }}
  code {{ background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #e2e8f0; }}
</style>
</head>
<body>
  <h1>Diagramme : soleil retiré (v{version})</h1>
  <p class="meta">
    Source : <strong>diagram-edit-v2.png</strong> ·
    Zone blanchie : <strong>({ZONE_X1},{ZONE_Y1}) → ({ZONE_X2},{ZONE_Y2})</strong> sur 2752×1536 ·
    Coût : <strong>$0 (Pillow local)</strong> ·
    Fichier : <code>scripts/image-rework/output/diagram-no-sun-v{version}.png</code>
  </p>

  <div class="compare">
    <div class="panel">
      <h2>Avant (zone à blanchir en pointillés rouges)</h2>
      <div class="panel-img">
        <img src="{src_url}" alt="source">
        <div class="zone-overlay"></div>
      </div>
    </div>
    <div class="panel">
      <h2>Après (v{version})</h2>
      <img src="{res_url}" alt="résultat">
    </div>
  </div>

  <div class="cta">
    <strong>Prochaine étape.</strong> Si la zone est OK → envoie-moi ton nouveau soleil, je le compose sur le diagramme. Si trop petite/grande → dis-moi (ex: « réduis à 600×400 » ou « élargis à 900×600 »), j'ajuste et je relance.
  </div>
</body>
</html>"""

    html_path = OUTPUT_DIR / f"diagram-no-sun-v{version}.html"
    html_path.write_text(html, encoding="utf-8")
    print(f"  preview HTML : {html_path.name}")

    subprocess.run(["open", str(html_path)], check=True)
    print(f"\n✓ v{version} prête. Coût : $0. Attends validation Pascal.")


if __name__ == "__main__":
    main()
