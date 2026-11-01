"""Render every product in content/ to a branded, print-ready PDF in content/dist/.

E-books: content/ebooks/<NN>-<slug>/book.md            -> dist/<NN>-<slug>.pdf
Courses: content/courses/<dir>/course.json + lessons/ + worksheets/ -> dist/<NN>-<slug>.pdf

Run with the tools venv:  tools/.venv/bin/python tools/build_pdfs.py [--only 9,12]
The PDFs are the paid product files: they stay in content/ (git-ignored), never in the public site.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
DIST = CONTENT / "dist"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
COMPANY = "עשית לי את היום בע״מ · ח.פ. 517347712"
MD_EXTENSIONS = ["tables", "fenced_code", "sane_lists", "attr_list"]
FRONTMATTER = re.compile(r"\A---\n.*?\n---\n", re.S)
# Daily journals with one "##" heading per day and no explicit page markers.
ONE_PAGE_PER_H2 = {22, 24, 35}

CSS = """
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
body { font-family: "Assistant", "Arial Hebrew", sans-serif; font-size: 11.5pt; line-height: 1.7; color: #2D1B46; direction: rtl; }
h1 { font-family: "Fraunces", "Assistant", serif; font-size: 24pt; line-height: 1.2; margin: 0 0 10pt; break-before: page; color: #2D1B46; }
h2 { font-size: 15pt; margin: 18pt 0 6pt; color: #6B3FD6; }
h3 { font-size: 12.5pt; margin: 14pt 0 4pt; }
p, li { orphans: 3; widows: 3; }
ul, ol { padding-inline-start: 18pt; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 10.5pt; break-inside: avoid; }
th, td { border: 1px solid #E6DDF2; padding: 6pt 8pt; text-align: right; vertical-align: top; }
th { background: #F6F0FF; }
pre { background: #F7F3FF; border-radius: 8pt; padding: 10pt 12pt; white-space: pre-wrap; font-family: "Assistant", sans-serif; font-size: 10.5pt; break-inside: avoid; }
code { font-family: inherit; }
blockquote { margin: 8pt 0; padding: 6pt 12pt; border-inline-start: 3pt solid #FF7EB6; background: #FFF4F9; }
hr { border: 0; margin: 0; break-after: page; }  /* "---" in the source = a new printed page */
.h2-pages h2 { break-before: page; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: space-between; padding: 20mm 10mm; border-radius: 10mm;
  background: radial-gradient(70% 60% at 15% 15%, #FFC2DD, transparent 70%), radial-gradient(70% 60% at 90% 85%, #BFD9FF, transparent 70%), radial-gradient(60% 60% at 85% 10%, #D9C6FF, transparent 70%), #FFF9FB; }
.cover .kind { font-weight: 800; letter-spacing: 1pt; font-size: 11pt; color: #6B3FD6; }
.cover h1 { break-before: auto; font-size: 40pt; margin: 0; }
.cover .sub { font-size: 15pt; margin-top: 8pt; }
.cover .brand { font-family: "Fraunces", serif; font-size: 18pt; font-weight: 600; direction: ltr; text-align: left; }
.legal { break-before: page; font-size: 10pt; color: #5B4D70; }
.blank { display: inline-block; min-width: 60%; border-bottom: 1px solid #CBBDE0; height: 14pt; vertical-align: bottom; }
.write-line { border-bottom: 1px solid #CBBDE0; height: 22pt; }
.lesson-meta { color: #6E5F86; font-size: 10.5pt; margin-bottom: 8pt; }
"""
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&family=Fraunces:opsz,wght@9..144,600&display=swap">'


# A line of only underscores is a writing line in worksheets, not a Markdown rule (which would break the page).
WRITING_LINE = re.compile(r"^[ \t\u00a0]*_{3,}[ \t\u00a0]*$", re.M)
# Fill-in blanks inside a line ("1. ______") would otherwise parse as a rule or emphasis.
BLANK_RUN = re.compile(r"_{5,}")


def md_to_html(text: str) -> str:
    text = WRITING_LINE.sub('<div class="write-line"></div>', FRONTMATTER.sub("", text))
    text = BLANK_RUN.sub('<span class="blank"></span>', text)
    return markdown.markdown(text, extensions=MD_EXTENSIONS)


def page(title: str, subtitle: str, kind: str, body: str, body_class: str = "") -> str:
    legal = (f'<section class="legal"><p><b>{html.escape(title)}</b></p><p>© 2026 {COMPANY}. כל הזכויות שמורות.</p>'
             "<p>הקובץ נמכר לשימוש אישי בלבד. אסור להעתיק, להפיץ, למכור או לשתף אותו, כולו או חלקו, בלי אישור בכתב.</p>"
             "<p>התוכן נועד ללימוד ולשימוש כללי ואינו ייעוץ מקצועי אישי.</p><p>youmademyday.store</p></section>")
    return (f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">{FONTS}<style>{CSS}</style></head><body>'
            f'<div class="{body_class}">'
            f'<section class="cover"><div class="kind">{html.escape(kind)}</div><div><h1>{html.escape(title)}</h1>'
            f'<div class="sub">{html.escape(subtitle)}</div></div><div class="brand">You Made My Day</div></section>'
            f"{body}{legal}</div></body></html>")


def print_pdf(doc: str, out: Path) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tmp:
        tmp.write(doc)
        src = Path(tmp.name)
    try:
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000",
                        f"--print-to-pdf={out}", src.as_uri()], check=True, capture_output=True, timeout=180)
    finally:
        src.unlink(missing_ok=True)
    if not out.exists() or out.stat().st_size == 0:
        raise RuntimeError(f"Chrome produced no PDF for {out.name}")


def build_ebook(folder: Path) -> Path:
    meta = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
    body = md_to_html((folder / "book.md").read_text(encoding="utf-8"))
    out = DIST / f"{folder.name}.pdf"
    kind = "תבנית להדפסה" if meta.get("type") == "template" else "ספר דיגיטלי"
    n = int(folder.name[:2])
    print_pdf(page(meta["title"], meta["subtitle"], kind, body, "h2-pages" if n in ONE_PAGE_PER_H2 else ""), out)
    return out


def build_course(folder: Path) -> Path:
    course = json.loads((folder / "course.json").read_text(encoding="utf-8"))
    lessons = sorted((folder / "lessons").glob("*.md"))
    sheets = {p.name[:2]: p for p in (folder / "worksheets").glob("*.md")}
    parts = []
    for i, lesson in enumerate(lessons, start=1):
        info = course["lessons"][i - 1] if i - 1 < len(course.get("lessons", [])) else {}
        meta_line = f'<div class="lesson-meta">שיעור {i} מתוך {len(lessons)} · כ-{info.get("minutes", "")} דקות</div>' if info else ""
        parts.append(meta_line + md_to_html(lesson.read_text(encoding="utf-8")))
        sheet = sheets.get(lesson.name[:2])
        if sheet:
            parts.append(md_to_html(sheet.read_text(encoding="utf-8")))
    n = int(course.get("n", 1))
    out = DIST / f"{n:02d}-{folder.name.split('-', 1)[-1] if folder.name[:2].isdigit() else folder.name}.pdf"
    print_pdf(page(course["title"], course["subtitle"], "קורס דיגיטלי", "".join(parts)), out)
    return out


def product_folders() -> list[tuple[int, str, Path]]:
    found = []
    for folder in sorted((CONTENT / "ebooks").glob("*")):
        if (folder / "book.md").exists() and (folder / "meta.json").exists():
            found.append((int(folder.name[:2]), "ebook", folder))
    for folder in sorted((CONTENT / "courses").glob("*")):
        if (folder / "course.json").exists() and (folder / "lessons").is_dir():
            n = int(json.loads((folder / "course.json").read_text(encoding="utf-8")).get("n", 1))
            found.append((n, "course", folder))
    return sorted(found)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="comma-separated product numbers")
    args = parser.parse_args()
    only = {int(x) for x in args.only.split(",") if x.strip()} if args.only else None
    DIST.mkdir(parents=True, exist_ok=True)
    failures = []
    for n, kind, folder in product_folders():
        if only and n not in only:
            continue
        try:
            out = (build_course if kind == "course" else build_ebook)(folder)
            print(f"ok   {n:>2} {out.name}  {out.stat().st_size // 1024} KB")
        except (OSError, RuntimeError, subprocess.SubprocessError, json.JSONDecodeError, KeyError) as err:
            failures.append(n)
            print(f"FAIL {n:>2} {folder.name}: {err}", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
