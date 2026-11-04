#!/usr/bin/env bash
# Renders the app icon PNGs in assets/ from the SVG sources in assets/brand/.
# Uses headless Microsoft Edge (or Chrome via BROWSER=...) and Python's Pillow for resizing.
# Run from the repo root in Git Bash:  bash scripts/render-icons.sh
set -euo pipefail

BROWSER="${BROWSER:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# render <svg> <out.png>: a 1024×1024 screenshot on a transparent background.
render() {
  local svg="$1" out="$2" winsvg winout
  winsvg="$(cygpath -m "$svg")"
  winout="$(cygpath -w "$out")"
  cat > "$TMP/page.html" <<EOF
<!DOCTYPE html><html><body style="margin:0;background:transparent"><img src="file:///$winsvg" width="1024" height="1024" style="display:block"></body></html>
EOF
  "$BROWSER" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size=1024,1024 --screenshot="$winout" "file:///$(cygpath -m "$TMP/page.html")" >/dev/null 2>&1
}

render "$ROOT/assets/brand/icon.svg" "$TMP/icon.png"
render "$ROOT/assets/brand/icon-art.svg" "$TMP/art.png"
render "$ROOT/assets/brand/icon-mono.svg" "$TMP/mono.png"

python - "$TMP" "$ROOT/assets" <<'EOF'
import sys
from PIL import Image
tmp, out = sys.argv[1], sys.argv[2]
icon = Image.open(f'{tmp}/icon.png').convert('RGB')        # iOS wants no transparency
art = Image.open(f'{tmp}/art.png').convert('RGBA')
mono = Image.open(f'{tmp}/mono.png').convert('RGBA')
icon.save(f'{out}/icon.png')
icon.save(f'{out}/brand/app-icon-1024.png')
icon.resize((48, 48), Image.LANCZOS).save(f'{out}/favicon.png')
art.save(f'{out}/splash-icon.png')
art.resize((512, 512), Image.LANCZOS).save(f'{out}/android-icon-foreground.png')
Image.new('RGBA', (512, 512), '#F8F4ED').save(f'{out}/android-icon-background.png')
mono.resize((432, 432), Image.LANCZOS).save(f'{out}/android-icon-monochrome.png')
print('Rendered icons into', out)
EOF
