"""Build the static store into web/public for GitHub Pages.

One index.html per language and slug (Pages has no rewrites): English at the root, other languages under /<code>/.
Each page carries its own <html lang/dir>, localised <title>/description, hreflang links and icons.
CSS/JS/fonts go in a folder named after the build, so a browser never mixes a new page with old cached files.
Run: python3 tools/build_site.py   (called by web/build.sh)
"""
from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site"
OUT = ROOT / "web" / "public"
DOMAIN = "youmademyday.store"
LANGS = {"en": "ltr", "he": "rtl", "fr": "ltr", "ar": "rtl", "ru": "ltr"}  # English first: it is the root site
DEFAULT = "en"
SLUGS = ["courses", "books", "pricing", "terms", "privacy", "refunds", "cookies", "accessibility", "checkout", "search"]
OG_LOCALE = {"en": "en_US", "he": "he_IL", "fr": "fr_FR", "ar": "ar_AR", "ru": "ru_RU"}


def live_langs() -> list[str]:
    """Published languages, from the LIVE line in site/js/i18n/config.js (single source of truth)."""
    m = re.search(r"export const LIVE = \[([^\]]*)\]", (SRC / "js" / "i18n" / "config.js").read_text(encoding="utf-8"))
    return re.findall(r'"(\w+)"', m.group(1)) if m else [DEFAULT]


def build_version() -> str:
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return str(int(time.time()))


def meta_text(lang: str, key: str) -> str:
    """Read one string from site/js/i18n/<lang>/ui.js, falling back to English."""
    for code in (lang, DEFAULT):
        path = SRC / "js" / "i18n" / code / "ui.js"
        if path.exists():
            m = re.search(rf'"{re.escape(key)}":\s*"((?:[^"\\]|\\.)*)"', path.read_text(encoding="utf-8"))
            if m:
                return json.loads(f'"{m.group(1)}"')
    return ""


def item_ids(lang: str) -> list[str]:
    path = SRC / "js" / "products" / f"{lang}.js"
    return re.findall(r'"id": "([cbk]\d+)"', path.read_text(encoding="utf-8")) if path.exists() else []


def prefix(lang: str) -> str:
    return "" if lang == DEFAULT else f"/{lang}"


def head(lang: str, slug: str, assets: str) -> str:
    title, desc = html.escape(meta_text(lang, "meta.title")), html.escape(meta_text(lang, "meta.description"))
    path = f"/{slug}" if slug else "/"
    alternates = "".join(f'<link rel="alternate" hreflang="{c}" href="https://{DOMAIN}{prefix(c)}{path}">' for c in live_langs())
    alternates += f'<link rel="alternate" hreflang="x-default" href="https://{DOMAIN}{path}">'
    css = "".join(f'<link rel="stylesheet" href="{assets}/{f}">' for f in ["fonts/fonts.css", "styles.css", "css/book3d.css", "css/home.css", "css/pages.css"])
    return f"""<!doctype html>
<html lang="{lang}" dir="{LANGS[lang]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#FFFFFF">
<link rel="canonical" href="https://{DOMAIN}{prefix(lang)}{path}">
{alternates}
<meta property="og:type" content="website"><meta property="og:site_name" content="You Made My Day">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<meta property="og:locale" content="{OG_LOCALE[lang]}"><meta property="og:image" content="https://{DOMAIN}/icons/icon-512.png">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml"><link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
{css}
<script type="module" src="{assets}/js/main.js"></script>
</head>
<body>
"""


def main() -> int:
    shutil.rmtree(OUT, ignore_errors=True)
    assets = f"/a/{build_version()}"
    for part in ["styles.css", "css", "js", "fonts"]:
        src, dst = SRC / part, OUT / assets.lstrip("/") / part
        dst.parent.mkdir(parents=True, exist_ok=True)
        (shutil.copytree if src.is_dir() else shutil.copy2)(src, dst)
    shutil.copytree(SRC / "icons", OUT / "icons")
    (OUT / "site.webmanifest").write_text(json.dumps({
        "name": "You Made My Day", "short_name": "YMMD", "start_url": "/", "display": "standalone", "background_color": "#FFFFFF", "theme_color": "#FFFFFF",
        "icons": [{"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png"}, {"src": "/icons/favicon.svg", "sizes": "any", "type": "image/svg+xml"}],
    }, indent=1), encoding="utf-8")
    body = (SRC / "body.html").read_text(encoding="utf-8")
    pages = 0
    for lang in live_langs():
        for slug in ["", *SLUGS, *item_ids(lang)]:
            target = OUT / prefix(lang).lstrip("/") / slug / "index.html"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(head(lang, slug, assets) + body + "</body>\n</html>\n", encoding="utf-8")
            pages += 1
    shutil.copy2(OUT / "index.html", OUT / "404.html")
    (OUT / "CNAME").write_text(DOMAIN + "\n")
    (OUT / ".nojekyll").touch()
    langs = "".join(f'<url><loc>https://{DOMAIN}{prefix(c)}/</loc></url>' for c in live_langs())
    (OUT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{langs}</urlset>\n')
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: https://{DOMAIN}/sitemap.xml\n")
    print(f"built {OUT.relative_to(ROOT)} ({pages} pages, assets {assets})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
