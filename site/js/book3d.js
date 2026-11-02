// Markup for the CSS-3D book (styles in css/book3d.css) and the small flat cover used in lists.
import { esc } from "./util.js";
import { BRAND } from "./business.js";

const KIND = { course: "קורס דיגיטלי", ebook: "ספר דיגיטלי", template: "תבנית להדפסה", bundle: "חבילה" };
const MOTIF_IDS = new Set(["sun", "half", "ring", "bars", "dot"]);

const motif = (p) => `m-${MOTIF_IDS.has(p.sh) ? p.sh : "sun"}`;
const colours = (p) => { const [bg, fg, sh] = p.cv; return `--bg:${bg};--fg:${fg};--sh:${sh}`; };

/** A 3D book for product p. `style` adds CSS custom properties such as --w (width) and --ry (turn). */
export function book3d(p, { style = "", mark = true } = {}) {
  const brand = mark ? `<span class="mk"><svg aria-hidden="true"><use href="#i-mark"/></svg>${BRAND}</span>` : "";
  return `<div class="b3 ${motif(p)}" style="${colours(p)};${style}" aria-hidden="true">
  <div class="fr"><div class="art"><i></i><i></i></div><div class="tx"><span class="kd">${KIND[p.type]}</span><span class="tt">${esc(p.title)}</span>${brand}</div></div>
  <div class="bk"></div><div class="sp"></div><div class="pg"></div><div class="tp"></div></div>`;
}

/** A book standing in its own perspective box with a soft floor shadow. */
export const bookStage = (p, opts = {}) => `<div class="bookbox">${opts.glow ? `<div class="glow"></div>` : ""}${book3d(p, opts)}<div class="floor"></div></div>`;

/** Small flat cover for cart and wishlist lines. */
export function flatCover(p) {
  const [bg, , sh] = p.cv;
  return `<div class="flat-cover" style="background:${bg}" aria-hidden="true"><i style="background:${sh}"></i></div>`;
}
