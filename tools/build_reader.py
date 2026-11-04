"""Render every course lesson (with its worksheet) and every e-book chapter to sanitized HTML for the site's reader.

Same Markdown pipeline as the PDFs (tools/build_pdfs.py), then an allowlist sanitizer, so nothing but plain
formatting reaches the browser. Output (private, git-ignored like the PDFs):
  content/view/<lang>/<product id>.json   {"units": [html, ...]}: every lesson or chapter, without its title
  content/view/index.json                 {"<lang>/<id>": {"kind", "units": [{"n", "title", "minutes"}]}}
One object per item and language keeps the R2 upload to a few hundred files.
Upload with: node tools/upload_files.ts (it also uploads content/view and writes worker/src/view/index.json).
Run: tools/.venv/bin/python tools/build_reader.py
"""
from __future__ import annotations

import json
import re
import sys
from html import escape
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_pdfs import CONTENT, FRONTMATTER, md_to_html  # noqa: E402  (same Markdown rules as the PDFs)

OUT = CONTENT / "view"
LANGS = ["he", "en", "fr", "ar", "ru"]
SOURCE_LANG = "he"
# Tags a lesson or chapter may keep, and the only attributes allowed on them.
ALLOWED = {"p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "b", "i", "code", "pre", "blockquote", "hr", "br",
           "table", "thead", "tbody", "tr", "th", "td", "a", "div", "span", "section", "h5"}
VOID = {"hr", "br"}
DROP_WITH_CONTENT = {"script", "style", "iframe", "object", "embed", "template"}
CLASSES = {"div": {"write-line", "worksheet"}, "span": {"blank"}}
SAFE_HREF = re.compile(r"^(https?://|mailto:)", re.I)
HEADING_1 = re.compile(r"^# (.+)$")
FENCE = re.compile(r"^(```|~~~)")


class Sanitizer(HTMLParser):
    """Keeps allowlisted tags with allowlisted attributes; escapes all text; drops everything else."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.skip_depth = 0
        self.open: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in DROP_WITH_CONTENT:
            self.skip_depth += 1
            return
        if self.skip_depth or tag not in ALLOWED:
            return
        kept = ""
        values = dict(attrs)
        if tag == "a":
            href = values.get("href") or ""
            if not SAFE_HREF.match(href):
                return  # a link that is not http(s)/mailto keeps its text only
            kept = f' href="{escape(href)}" rel="noopener noreferrer" target="_blank"'
        allowed_classes = CLASSES.get(tag, set())
        classes = [c for c in (values.get("class") or "").split() if c in allowed_classes]
        if classes:
            kept += f' class="{" ".join(classes)}"'
        self.out.append(f"<{tag}{kept}>")
        if tag not in VOID:
            self.open.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag in ALLOWED and tag not in VOID and self.open and self.open[-1] == tag:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag in DROP_WITH_CONTENT:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if self.skip_depth or tag not in self.open:
            return
        while self.open:
            last = self.open.pop()
            self.out.append(f"</{last}>")
            if last == tag:
                break

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.out.append(escape(data, quote=False))

    def result(self) -> str:
        return "".join(self.out) + "".join(f"</{t}>" for t in reversed(self.open))


def sanitize(html_text: str) -> str:
    parser = Sanitizer()
    parser.feed(html_text)
    parser.close()
    return parser.result()


# "- [ ] task" / "- [x] task": shown as check boxes, as in the PDFs' printed lists.
TASK_BOX = re.compile(r"^(\s*[-*] )\[( |x|X)\] ", re.M)


def render(markdown_text: str) -> str:
    text = TASK_BOX.sub(lambda m: f"{m.group(1)}{'☑' if m.group(2).lower() == 'x' else '☐'} ", markdown_text)
    return sanitize(md_to_html(text))


def strip_title(markdown_text: str) -> tuple[str, str]:
    """The first "# " heading (the unit's title) and the text without it."""
    lines = FRONTMATTER.sub("", markdown_text).split("\n")
    for i, line in enumerate(lines):
        match = HEADING_1.match(line)
        if match:
            return match.group(1).strip(), "\n".join(lines[:i] + lines[i + 1:])
    return "", "\n".join(lines)


def split_chapters(markdown_text: str) -> list[tuple[str, str]]:
    """A book split on its "# " headings (outside code fences); text before the first goes to the first chapter."""
    chapters: list[tuple[str, list[str]]] = []
    preamble: list[str] = []
    in_fence = False
    for line in FRONTMATTER.sub("", markdown_text).split("\n"):
        if FENCE.match(line):
            in_fence = not in_fence
        match = None if in_fence else HEADING_1.match(line)
        if match:
            chapters.append((match.group(1).strip(), []))
        elif chapters:
            chapters[-1][1].append(line)
        else:
            preamble.append(line)
    if not chapters:
        return [("", "\n".join(preamble))]
    first_title, first_lines = chapters[0]
    chapters[0] = (first_title, preamble + first_lines)
    return [(title, "\n".join(lines)) for title, lines in chapters]


def source_dir(lang: str) -> Path:
    return CONTENT if lang == SOURCE_LANG else CONTENT / "i18n" / lang


def write_item(lang: str, product_id: str, bodies: list[str]) -> None:
    path = OUT / lang / f"{product_id}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"units": bodies}, ensure_ascii=False), encoding="utf-8")


def build_course(lang: str, folder: Path, n: int) -> dict:
    course = json.loads((folder / "course.json").read_text(encoding="utf-8"))
    info = course.get("lessons", [])
    sheets = {p.name[:2]: p for p in (folder / "worksheets").glob("*.md")}
    units, bodies = [], []
    for i, lesson in enumerate(sorted((folder / "lessons").glob("*.md")), start=1):
        heading, text = strip_title(lesson.read_text(encoding="utf-8"))
        body = render(text)
        sheet = sheets.get(lesson.name[:2])
        if sheet:
            body += f'<section class="worksheet">{render(sheet.read_text(encoding="utf-8"))}</section>'
        meta = info[i - 1] if i - 1 < len(info) else {}
        bodies.append(body)
        units.append({"n": i, "title": meta.get("title") or heading, "minutes": meta.get("minutes")})
    write_item(lang, f"c{n}", bodies)
    return {"kind": "course", "units": units}


def build_book(lang: str, folder: Path, n: int) -> dict:
    chapters = split_chapters((folder / "book.md").read_text(encoding="utf-8"))
    write_item(lang, f"b{n}", [render(text) for _, text in chapters])
    return {"kind": "book", "units": [{"n": i, "title": title, "minutes": None} for i, (title, _) in enumerate(chapters, start=1)]}


def course_number(folder_name: str) -> int:
    # The number lives in the Hebrew source's course.json (one course uses an older layout without it).
    data = json.loads((CONTENT / "courses" / folder_name / "course.json").read_text(encoding="utf-8"))
    return int(data.get("n") or data.get("catalogNumber") or 0)


def main() -> int:
    index: dict[str, dict] = {}
    for lang in LANGS:
        root = source_dir(lang)
        for folder in sorted((root / "courses").glob("*")):
            if (folder / "lessons").is_dir():
                n = course_number(folder.name)
                if n:
                    index[f"{lang}/c{n}"] = build_course(lang, folder, n)
        for folder in sorted((root / "ebooks").glob("[0-9][0-9]-*")):
            if (folder / "book.md").exists():
                index[f"{lang}/b{int(folder.name[:2])}"] = build_book(lang, folder, int(folder.name[:2]))
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    units = sum(len(v["units"]) for v in index.values())
    print(f"reader: {len(index)} items, {units} units → content/view")
    return 0


if __name__ == "__main__":
    sys.exit(main())
