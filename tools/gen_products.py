"""Generate site/js/products/<lang>.js (public store metadata) from the private content/ folder.

Hebrew is the source (content/); other languages read their translations from content/i18n/<lang>/
with the same tree. A product without a translation is left out of that language's store.
Usage: tools/.venv/bin/python tools/gen_products.py [--lang en]   (default: every language)

Only store-page data is exported: titles, descriptions, lesson and chapter lists, one short excerpt,
page counts and prices. The product files themselves never leave content/.
Run after tools/build_pdfs.py so page counts and file sizes come from the real PDFs.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
OUT_DIR = ROOT / "site" / "js" / "products"
LANGS = ["he", "en", "fr", "ar", "ru"]
EXTRA = json.loads((ROOT / "tools" / "catalog_i18n.json").read_text(encoding="utf-8"))
WORDS_PER_PAGE = 260  # fallback when a PDF is not built yet

# Bundle contents (owner-approved catalog plan, 02.11.2026).
BUNDLES = {49: [9, 11, 12, 18, 19], 50: [30, 31, 32, 33, 34, 35]}

# Cover colours per category: [background, text, motif]. The soft brand palette (owner, 02.11.2026).
CATEGORY_COLORS = {
    "טכנולוגיה": ["#2B1E40", "#FFFFFF", "#F48FB8"], "עיצוב": ["#FFD9E8", "#2B1E40", "#F7A8C9"],
    "שיווק": ["#EEE6FF", "#2B1E40", "#C9B2FF"], "צילום": ["#1D1D1F", "#FFFFFF", "#8E6BE8"],
    "פרודוקטיביות": ["#DCEBFF", "#1D2B47", "#9CC6FF"], "קריירה": ["#3B2A5C", "#FFFFFF", "#F48FB8"],
    "עסקים": ["#F4EEFF", "#2B1E40", "#D7C4FF"], "כתיבה": ["#FFF4EA", "#2B1E40", "#F7B9A0"],
    "יצירה": ["#FFE7F0", "#2B1E40", "#F48FB8"], "בישול": ["#FFE3D6", "#3A1F1A", "#FFB79C"],
    "בית": ["#E2F1EA", "#16302A", "#A9D8C2"], "משפחה": ["#FFF1DC", "#3A2A10", "#FFCF8A"],
    "טיולים": ["#E6F2FF", "#13314D", "#9CC6FF"], "שפות": ["#E9E4FF", "#2B1E40", "#B9A4FF"],
    "תנועה": ["#E3F4EC", "#123A2B", "#8FD3B5"], "חבילות": ["#1D1D1F", "#FFFFFF", "#C9B2FF"],
}
SHAPES = ["sun", "half", "ring", "bars", "dot"]
PAGE_RE = re.compile(rb"/Type\s*/Page[^s]")


def src(lang: str) -> Path:
    return CONTENT if lang == "he" else CONTENT / "i18n" / lang


def pdf_stats(lang: str, n: int, words: int) -> tuple[int, float]:
    dist = CONTENT / "dist" if lang == "he" else CONTENT / "dist" / lang
    pdfs = sorted(dist.glob(f"{n:02d}-*.pdf"))
    if pdfs:
        data = pdfs[0].read_bytes()
        return len(PAGE_RE.findall(data)), round(len(data) / 1_048_576, 1) or 0.1
    return max(1, round(words / WORDS_PER_PAGE)), 1.0


def paragraphs(text: str | list[str]) -> list[str]:
    if isinstance(text, list):
        return [t for t in text if t.strip()]
    return [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]


def find_course(lang: str, n: int, title: str) -> dict | None:
    """Locate the course by its Hebrew source folder, then read the same folder in the target language."""
    for folder in (CONTENT / "courses").glob("*"):
        path = folder / "course.json"
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if int(data.get("n", 0) or 0) == n or data.get("title") == title:
            target = src(lang) / "courses" / folder.name / "course.json"
            return json.loads(target.read_text(encoding="utf-8")) if target.exists() else None
    return None


def find_ebook(lang: str, n: int) -> dict | None:
    for folder in (src(lang) / "ebooks").glob(f"{n:02d}-*"):
        if (folder / "meta.json").exists():
            return json.loads((folder / "meta.json").read_text(encoding="utf-8"))
    return None


def product_id(p: dict) -> str:
    return {"course": "c", "bundle": "k"}.get(p["type"], "b") + str(p["n"])


def category_map(lang: str, plan: list[dict]) -> dict[str, str]:
    """Hebrew category -> this language's name, learned from translated e-book metadata."""
    cats = dict(EXTRA[lang]["cats"])
    for p in plan:
        m = find_ebook(lang, p["n"]) if p["type"] in ("ebook", "template") else None
        if m and (m.get("category")):
            cats.setdefault(p["cat"], m["category"])
    return cats


def build(lang: str) -> tuple[list[dict], list[int]]:
    plan = json.loads((CONTENT / "catalog.json").read_text(encoding="utf-8"))["products"]
    cats = category_map(lang, plan)
    out, missing = [], []
    for p in plan:
        n = p["n"]
        base = {"id": product_id(p), "n": n, "type": p["type"], "title": p["title"], "sub": p["sub"], "cat": cats.get(p["cat"], p["cat"]),
                "price": p["price"], "cv": CATEGORY_COLORS.get(p["cat"], CATEGORY_COLORS["חבילות"]), "sh": SHAPES[n % len(SHAPES)]}
        if p["type"] == "course":
            c = find_course(lang, n, p["title"])
            if not c:
                missing.append(n)
                continue
            for_who = c.get("for") or c.get("forWho") or []  # course 1 was written with camelCase keys
            if lang != "he":
                base.update(title=c.get("title", p["title"]), sub=c.get("subtitle", p["sub"]))
            base.update(description=paragraphs(c.get("description", p["sub"])), outcomes=c.get("outcomes") or c.get("learningOutcomes") or [],
                        forWho=for_who if isinstance(for_who, list) else paragraphs(for_who),
                        lessons=[{"title": l["title"], "summary": l.get("summary", ""), "minutes": int(l.get("minutes", 20))} for l in c["lessons"]])
        elif p["type"] == "bundle":
            text = EXTRA[lang]["bundles"][str(n)]
            base.update(title=text["title"], sub=text["sub"], includes=[f"b{i}" for i in BUNDLES[n]], description=[text["description"]])
        else:
            m = find_ebook(lang, n)
            if not m:
                missing.append(n)
                continue
            if lang != "he":
                base.update(title=m.get("title", p["title"]), sub=m.get("subtitle", p["sub"]))
            pages, mb = pdf_stats(lang, n, int(m.get("words", 4000)))
            base.update(description=paragraphs(m.get("description", p["sub"])), chapters=m.get("chapters", []),
                        excerpt=m.get("excerpt", ""), pages=pages, mb=mb)
        out.append(base)
    # a bundle is only offered when all of its books exist in this language
    have = {x["id"] for x in out}
    out = [x for x in out if x["type"] != "bundle" or all(i in have for i in x["includes"])]
    return out, missing


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", choices=LANGS, help="one language (default: all)")
    args = parser.parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for lang in [args.lang] if args.lang else LANGS:
        products, missing = build(lang)
        out = OUT_DIR / f"{lang}.js"
        out.write_text("// Generated by tools/gen_products.py from content/ — do not edit by hand.\n"
                       f"export const PRODUCTS = {json.dumps(products, ensure_ascii=False, indent=1)};\n", encoding="utf-8")
        print(f"{lang}: wrote {len(products)} products to {out.relative_to(ROOT)}" + (f" (not translated yet: {missing})" if missing else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
