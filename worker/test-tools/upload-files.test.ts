import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cleanFilename, sourceFile } from "../../tools/upload_files.ts";
import { ROOT } from "../../tools/polar/api.ts";

// content/ is private and not in git: the file lookup runs only where the PDFs are built.
const hasContent = existsSync(join(ROOT, "content", "dist"));

describe("upload_files", () => {
  it("drops the file number from the download name", () => {
    expect(cleanFilename("/x/content/dist/07-instagram-small-business.pdf")).toBe("instagram-small-business.pdf");
  });
  it.skipIf(!hasContent)("finds the Hebrew and translated PDFs by number, and nothing for a missing language", () => {
    expect(sourceFile("he", 51)).toMatch(/content\/dist\/51-[^/]+\.pdf$/);
    expect(sourceFile("fr", 51)).toMatch(/content\/dist\/fr\/51-[^/]+\.pdf$/);
    expect(sourceFile("en", 44)).toBeUndefined();
    expect(sourceFile("xx", 1)).toBeUndefined();
  });
});
