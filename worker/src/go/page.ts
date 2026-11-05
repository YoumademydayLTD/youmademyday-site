// The bounce page (pure): a tiny Hebrew page that hands an in-app browser's buyer to the phone's real browser.
// No external file, font or tracker: one inline style and one inline script, both allowed only by this reply's nonce.
import { chromeIntentUrl, safariUrl, type BrowserKind } from "./browser.ts";
import { GO_COPY } from "./copy.ts";

// Owner's brief, 05.11.2026: Android shows the Chrome button if the page is still here after ~1.5 s;
// iPhone never waits on Safari (Apple Pay already works in Telegram's own browser) and goes on after ~1.2 s.
export const ANDROID_FALLBACK_MS = 1500;
export const IOS_FALLBACK_MS = 1200;

export interface BouncePage { kind: Exclude<BrowserKind, "browser">; checkoutUrl: string; nonce: string }

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

// The store's look (site/styles.css tokens), with the system font only so nothing loads from elsewhere.
const STYLE = `:root{--bg:#FFFFFF;--tile:#F5F5F7;--ink:#1D1D1F;--muted:#6E6E73;--spring:cubic-bezier(.22,1,.36,1);
--font:-apple-system,BlinkMacSystemFont,"SF Hebrew","Heebo","Roboto",system-ui,sans-serif}
*{box-sizing:border-box;margin:0}
html,body{height:100%;background:var(--bg);color:var(--ink);font-family:var(--font);-webkit-text-size-adjust:100%}
main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px 16px;text-align:center}
h1{font-size:24px;font-weight:600;letter-spacing:-.01em;line-height:1.25}
p{font-size:17px;color:var(--muted);line-height:1.45;max-width:30ch}
.btn{display:flex;align-items:center;justify-content:center;width:100%;max-width:340px;height:56px;margin-top:10px;border-radius:999px;
background:var(--ink);color:#fff;font-size:18px;font-weight:500;text-decoration:none;transition:transform .35s var(--spring)}
.btn:active{transform:scale(.97)}
.stay{font-size:15px;color:var(--muted);text-decoration:underline;padding:10px}
.wait .later{display:none}`;

// Without JavaScript the page simply shows its links; with it, they wait until the hand-off had its chance.
// The script sits at the end of <body>: a hand-off to another app can stop the page loading, and the buttons must
// already be on the page when it does (seen in headless Chromium, 05.11.2026: a script in <head> left an empty page).
const ANDROID_SCRIPT = `(function(){var h=document.documentElement;h.classList.add("wait");
var t=setTimeout(function(){h.classList.remove("wait")},${ANDROID_FALLBACK_MS});
document.addEventListener("visibilitychange",function(){if(document.hidden){clearTimeout(t);h.classList.remove("wait")}});
location.href=h.dataset.go})();`;

// If Safari took over, the page is hidden: it must not also open the payment page here.
const IOS_SCRIPT = `(function(){var h=document.documentElement;h.classList.add("wait");
setTimeout(function(){if(document.hidden){h.classList.remove("wait");return}location.replace(h.dataset.pay)},${IOS_FALLBACK_MS});
location.href=h.dataset.go})();`;

interface Shell { nonce: string; data?: Record<string, string>; script?: string; body: string }

function shell({ nonce, data = {}, script, body }: Shell): string {
  const attrs = Object.entries(data).map(([key, value]) => ` data-${key}="${escapeHtml(value)}"`).join("");
  return `<!doctype html><html lang="he" dir="rtl"${attrs}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex">
<meta name="referrer" content="no-referrer"><title>${escapeHtml(GO_COPY.title)}</title>
<style nonce="${nonce}">${STYLE}</style></head>
<body><main>${body}</main>${script ? `<script nonce="${nonce}">${script}</script>` : ""}</body></html>`;
}

export function renderBouncePage({ kind, checkoutUrl, nonce }: BouncePage): string {
  const pay = escapeHtml(checkoutUrl);
  if (kind === "android-in-app") {
    const go = chromeIntentUrl(checkoutUrl);
    const copy = GO_COPY.android;
    return shell({ nonce, data: { go, pay: checkoutUrl }, script: ANDROID_SCRIPT, body: `<h1>${copy.heading}</h1><p>${copy.body}</p>
<a class="btn later" href="${escapeHtml(go)}">${copy.button}</a><a class="stay later" href="${pay}">${copy.stay}</a>` });
  }
  const copy = GO_COPY.ios;
  return shell({ nonce, data: { go: safariUrl(checkoutUrl), pay: checkoutUrl }, script: IOS_SCRIPT, body: `<h1>${copy.heading}</h1><p>${copy.body}</p>
<a class="btn later" href="${pay}">${copy.button}</a>` });
}

export const renderMissingPage = (nonce: string): string =>
  shell({ nonce, body: `<h1>${GO_COPY.missing.heading}</h1><p>${GO_COPY.missing.body}</p>` });

/** Headers for every page this route serves: never cached (one buyer's link), never indexed, nothing else may load. */
export const pageHeaders = (nonce: string): Record<string, string> => ({
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex",
  "X-Content-Type-Options": "nosniff",
  "Vary": "User-Agent",
  "Content-Security-Policy": `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
});
