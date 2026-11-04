"""Unit tests for tools/build_reader.py: the sanitizer, task boxes and the chapter split.
Run: tools/.venv/bin/python -m unittest tools/test_build_reader.py"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_reader import render, sanitize, split_chapters, strip_title  # noqa: E402


class SanitizeTest(unittest.TestCase):
    def test_keeps_formatting_and_escapes_text(self):
        self.assertEqual(sanitize("<p>a <strong>b</strong> &lt;c&gt;</p>"), "<p>a <strong>b</strong> &lt;c&gt;</p>")

    def test_drops_scripts_handlers_and_unknown_tags(self):
        self.assertEqual(sanitize('<p onclick="x()">hi<script>alert(1)</script><img src=x onerror=y></p>'), "<p>hi</p>")

    def test_keeps_only_safe_links(self):
        self.assertEqual(sanitize('<a href="https://x.y">ok</a>'), '<a href="https://x.y" rel="noopener noreferrer" target="_blank">ok</a>')
        self.assertEqual(sanitize('<a href="javascript:alert(1)">bad</a>'), "bad")

    def test_keeps_allowed_classes_only(self):
        self.assertEqual(sanitize('<div class="write-line evil"></div><span class="x">t</span>'), '<div class="write-line"></div><span>t</span>')

    def test_closes_open_tags(self):
        self.assertEqual(sanitize("<ul><li>a"), "<ul><li>a</li></ul>")


class RenderTest(unittest.TestCase):
    def test_task_boxes_and_tables(self):
        html = render("- [ ] one\n- [x] two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n")
        self.assertIn("☐ one", html)
        self.assertIn("☑ two", html)
        self.assertIn("<table>", html)

    def test_code_is_escaped(self):
        self.assertIn("&lt;button&gt;", render("```\n<button>\n```\n"))


class SplitTest(unittest.TestCase):
    def test_chapters_on_h1_outside_code(self):
        chapters = split_chapters("---\nn: 1\n---\nintro\n# One\na\n```\n# not a heading\n```\n# Two\nb\n")
        self.assertEqual([t for t, _ in chapters], ["One", "Two"])
        self.assertIn("intro", chapters[0][1])
        self.assertIn("# not a heading", chapters[0][1])

    def test_strip_title(self):
        self.assertEqual(strip_title("# Lesson 1: Hi\n\ntext")[0], "Lesson 1: Hi")


if __name__ == "__main__":
    unittest.main()
