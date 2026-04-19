#!/usr/bin/env python3
"""
Compose le diagramme final :
1. Détoure le soleil source (JPG) via fal-ai/bria/background/remove → PNG transparent
2. Étend le cadre de diagram-edit-v2.png (+padding haut + gauche)
3. Colle le soleil détouré par-dessus l'ancien soleil tronqué (qui reste intact en dessous mais sera caché)

Source diagramme : scripts/image-rework/output/diagram-edit-v2.png (2752 x 1536)
Source soleil   : ~/Library/Mobile Documents/com~apple~CloudDocs/Téléchargements/72d60cd3-...jpeg
Output         : scripts/image-rework/output/diagram-final-v{N}.png

Coût : $0.018 (détourage Bria).
"""

import base64
import json
import re
import subprocess
import time
import urllib.request
from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).parent.parent.parent
ENV_FILE = PROJECT_ROOT / "template" / ".env.local"
OUTPUT_DIR = Path(__file__).parent / "output"

DIAGRAM_SOURCE = OUTPUT_DIR / "diagram-edit-v2.png"
SUN_SOURCE = Path(
    "/Users/pascal/Library/Mobile Documents/com~apple~CloudDocs/Téléchargements/72d60cd3-6fc8-4b12-8be2-81bc5a0d3f1e.jpeg"
)

BRIA_ENDPOINT = "https://queue.fal.run/fal-ai/bria/background/remove"
BRIA_PRICE_USD = 0.018

# Padding pour étendre le cadre (haut + gauche)
PAD_TOP = 400
PAD_LEFT = 400

# Position et largeur du nouveau soleil : la HAUTEUR est calculée automatiquement
# pour préserver le ratio original du soleil (pas de déformation).
SUN_WIDTH = 1100
SUN_CENTER_X = 650
SUN_CENTER_Y = 650

# Cache : si un sun-transparent-vN.png existe, on le réutilise (pas de re-coût Bria).
REUSE_TRANSPARENT_CACHE = True


def load_fal_key() -> str:
    content = ENV_FILE.read_text()
    m = re.search(r'^FAL_KEY="?([^"\n]+)"?', content, re.MULTILINE)
    if not m:
        raise SystemExit("FAL_KEY introuvable dans template/.env.local")
    return m.group(1).strip()


def next_version() -> int:
    pattern = re.compile(r"^diagram-final-v(\d+)\.png$")
    versions = []
    for f in OUTPUT_DIR.iterdir():
        m = pattern.match(f.name)
        if m:
            versions.append(int(m.group(1)))
    return max(versions) + 1 if versions else 1


def image_to_data_url(path: Path) -> str:
    data = path.read_bytes()
    ext = path.suffix.lower().lstrip(".")
    mime = "image/png" if ext == "png" else "image/jpeg"
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{b64}"


def fal_post(url: str, payload: dict, api_key: str) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Key {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fal_get(url: str, api_key: str) -> dict:
    req = urllib.request.Request(
        url, headers={"Authorization": f"Key {api_key}"}, method="GET"
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def remove_bg(sun_path: Path, api_key: str) -> bytes:
    """Retourne les bytes du PNG transparent du soleil détouré."""
    print("  détourage soleil via fal-ai/bria/background/remove...")
    data_url = image_to_data_url(sun_path)
    submit = fal_post(BRIA_ENDPOINT, {"image_url": data_url}, api_key)

    # Réponse synchrone éventuelle
    if "image" in submit and submit["image"].get("url"):
        return download(submit["image"]["url"])

    request_id = submit.get("request_id")
    if not request_id:
        raise SystemExit(f"  Bria : pas de request_id : {json.dumps(submit)[:200]}")

    status_url = submit.get("status_url") or f"{BRIA_ENDPOINT}/requests/{request_id}/status"
    result_url = submit.get("response_url") or f"{BRIA_ENDPOINT}/requests/{request_id}"

    for attempt in range(60):
        time.sleep(2)
        try:
            status = fal_get(status_url, api_key)
        except Exception:
            continue
        s = status.get("status", "?")
        print(f"\r  polling [{attempt + 1}/60] status={s}   ", end="", flush=True)
        if s == "COMPLETED":
            print()
            result = fal_get(result_url, api_key)
            url = result.get("image", {}).get("url")
            if not url:
                raise SystemExit(f"  Bria : pas d'image dans le résultat : {json.dumps(result)[:200]}")
            return download(url)
        if s in ("FAILED", "CANCELLED"):
            raise SystemExit(f"  Bria : status {s} - {status.get('error', '')}")

    raise SystemExit("  Bria : poll timeout (2 min)")


def download(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=60) as resp:
        return resp.read()


def main():
    if not DIAGRAM_SOURCE.exists():
        raise SystemExit(f"Diagramme source introuvable : {DIAGRAM_SOURCE}")
    if not SUN_SOURCE.exists():
        raise SystemExit(f"Soleil source introuvable : {SUN_SOURCE}")

    version = next_version()
    print(f"→ Compose diagramme final v{version}")
    print(f"  diagramme : {DIAGRAM_SOURCE.name}")
    print(f"  soleil    : {SUN_SOURCE.name}")

    # 1. Détoure le soleil (avec cache pour éviter re-coût Bria)
    cached = sorted(OUTPUT_DIR.glob("sun-transparent-v*.png"))
    if REUSE_TRANSPARENT_CACHE and cached:
        sun_transparent_path = cached[-1]
        print(f"  soleil détouré réutilisé (cache) : {sun_transparent_path.name}  [coût $0]")
    else:
        api_key = load_fal_key()
        sun_png_bytes = remove_bg(SUN_SOURCE, api_key)
        sun_transparent_path = OUTPUT_DIR / f"sun-transparent-v{version}.png"
        sun_transparent_path.write_bytes(sun_png_bytes)
        print(f"  soleil détouré sauvegardé : {sun_transparent_path.name}")

    sun_img = Image.open(sun_transparent_path).convert("RGBA")
    print(f"  soleil détouré dim source : {sun_img.width}x{sun_img.height}")

    # Crop au plus serré (getbbox) pour éliminer les marges transparentes    # sinon le soleil visible n'occupe pas tout le cadre et l'ancien dépasse.
    bbox = sun_img.getbbox()
    if bbox:
        sun_img = sun_img.crop(bbox)
        print(f"  soleil cropped au plus serré : {sun_img.width}x{sun_img.height} (bbox alpha {bbox})")

    # 2. Étend le cadre du diagramme
    diagram = Image.open(DIAGRAM_SOURCE).convert("RGBA")
    new_w = diagram.width + PAD_LEFT
    new_h = diagram.height + PAD_TOP
    canvas = Image.new("RGBA", (new_w, new_h), (255, 255, 255, 255))
    canvas.paste(diagram, (PAD_LEFT, PAD_TOP))
    print(f"  cadre étendu : {new_w}x{new_h} (padding +{PAD_LEFT} gauche, +{PAD_TOP} haut)")

    # 3. Resize en préservant le ratio (pas de déformation)
    ratio = sun_img.height / sun_img.width
    sun_h_target = round(SUN_WIDTH * ratio)
    sun_resized = sun_img.resize((SUN_WIDTH, sun_h_target), Image.LANCZOS)
    paste_x = SUN_CENTER_X - SUN_WIDTH // 2
    paste_y = SUN_CENTER_Y - sun_h_target // 2
    canvas.paste(sun_resized, (paste_x, paste_y), sun_resized)
    print(f"  soleil resize ratio préservé : {SUN_WIDTH}x{sun_h_target} (ratio {ratio:.3f})")
    print(f"  soleil collé à ({paste_x},{paste_y})")

    # 4. Sauvegarde
    out_path = OUTPUT_DIR / f"diagram-final-v{version}.png"
    canvas.save(out_path)
    print(f"  sauvegardé : {out_path.name}")

    # 5. HTML preview
    res_url = image_to_data_url(out_path)
    src_url = image_to_data_url(DIAGRAM_SOURCE)
    sun_url = image_to_data_url(sun_transparent_path)

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Diagramme final : v{version}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; line-height: 1.5; }}
  h1 {{ font-size: 20px; margin-bottom: 4px; }}
  .meta {{ color: #94a3b8; font-size: 13px; margin-bottom: 20px; }}
  .meta strong {{ color: #cbd5e1; }}
  .stack {{ display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }}
  .panel {{ background: #1e293b; border-radius: 10px; padding: 12px; }}
  .panel h2 {{ font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }}
  .panel img {{ width: 100%; height: auto; border-radius: 6px; display: block; background: #fff; max-width: 1400px; margin: 0 auto; }}
  .panel.small img {{ max-width: 400px; }}
  .row {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
  .cta {{ background: #134e4a; border: 1px solid #14b8a6; border-radius: 10px; padding: 16px; color: #ccfbf1; font-size: 14px; }}
  .cta strong {{ color: #5eead4; }}
  code {{ background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #e2e8f0; }}
</style>
</head>
<body>
  <h1>Diagramme final : v{version}</h1>
  <p class="meta">
    Soleil détouré (Bria $0.018) + cadre étendu (Pillow local) + composition.
    Cadre final : <strong>{new_w}×{new_h}</strong> ·
    Soleil : <strong>{SUN_WIDTH}×{sun_h_target} (ratio préservé) centré sur ({SUN_CENTER_X},{SUN_CENTER_Y})</strong> ·
    Fichier : <code>scripts/image-rework/output/diagram-final-v{version}.png</code>
  </p>

  <div class="stack">
    <div class="panel">
      <h2>Final v{version}</h2>
      <img src="{res_url}" alt="final">
    </div>
    <div class="row">
      <div class="panel small">
        <h2>Source diagramme</h2>
        <img src="{src_url}" alt="diagramme source">
      </div>
      <div class="panel small">
        <h2>Soleil détouré (transparent)</h2>
        <img src="{sun_url}" alt="soleil détouré">
      </div>
    </div>
  </div>

  <div class="cta">
    <strong>Prochaine étape.</strong> Si rendu OK → je détoure le fond blanc final ($0.018 supplémentaires) pour livrer un PNG transparent prêt à intégrer sur filmpro.ch. Si position/taille soleil à ajuster → dis-moi (ex: « plus grand », « plus à droite », « plus haut »), je relance la composition (gratuit, juste Pillow).
  </div>
</body>
</html>"""

    html_path = OUTPUT_DIR / f"diagram-final-v{version}.html"
    html_path.write_text(html, encoding="utf-8")
    print(f"  preview HTML : {html_path.name}")

    subprocess.run(["open", str(html_path)], check=True)
    print(f"\n✓ v{version} prête. Coût : ${BRIA_PRICE_USD:.3f}. Attends validation Pascal.")


if __name__ == "__main__":
    main()
