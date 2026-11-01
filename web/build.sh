#!/usr/bin/env bash
# Wraps the artifact-style page fragment (../mockup/index.html, the single source)
# into a full HTML document, and writes one copy per slug so /pricing, /terms…
# load directly on static hosting (GitHub Pages has no rewrites).
set -euo pipefail
cd "$(dirname "$0")"
SRC="../mockup/index.html"
OUT_DIR="public"
DOMAIN="youmademyday.online"
SLUGS=(courses books pricing terms privacy refunds library checkout search)
ITEM_IDS=$(grep -oE '\{id:"[cb][0-9]+"' "$SRC" | grep -oE '[cb][0-9]+')

rm -rf "$OUT_DIR" && mkdir -p "$OUT_DIR"
{
  printf '<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="description" content="קורסים מצולמים וספרים דיגיטליים בעברית. You Made My Day, עשית לי את היום.">\n<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%%}[hidden]{display:none!important}</style>\n</head>\n<body>\n'
  cat "$SRC"
  printf '\n</body>\n</html>\n'
} > "$OUT_DIR/index.html"

for slug in "${SLUGS[@]}" $ITEM_IDS; do
  mkdir -p "$OUT_DIR/$slug" && cp "$OUT_DIR/index.html" "$OUT_DIR/$slug/index.html"
done
cp "$OUT_DIR/index.html" "$OUT_DIR/404.html"
echo "$DOMAIN" > "$OUT_DIR/CNAME"
touch "$OUT_DIR/.nojekyll"
echo "built $OUT_DIR ($(find "$OUT_DIR" -name index.html | wc -l | tr -d ' ') pages)"
