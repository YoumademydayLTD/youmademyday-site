// Which browser opened a bounce link (pure), from its User-Agent.
// Owner, 05.11.2026: in Telegram's in-app browser on Android, Google Pay never appears and many card forms fail,
// so in-app browsers are sent on to the phone's real browser; any normal browser goes straight to the payment page.

export type BrowserKind = "android-in-app" | "ios-in-app" | "browser";

// Apps whose own browser puts its name in the User-Agent (Telegram, Instagram, Facebook, Messenger, LINE, WeChat).
const IN_APP_MARKERS = /Telegram|Instagram|FBAN|FBAV|FB_IAB|FBIOS|MessengerForiOS|\bLine\/|MicroMessenger/i;
const ANDROID = /Android/i;
// Android's System WebView marks itself with "; wv)"; Chrome and Chrome Custom Tabs do not.
const ANDROID_WEBVIEW = /;\s*wv\)/;
const IOS = /iPhone|iPad|iPod/i;
// Every iOS browser app (Safari, Chrome, Firefox, Edge) sends "Safari/"; a bare WKWebView inside an app does not.
const IOS_BROWSER = /Safari\//;

export function browserKindOf(userAgent: string | null): BrowserKind {
  const ua = userAgent ?? "";
  if (ANDROID.test(ua)) return IN_APP_MARKERS.test(ua) || ANDROID_WEBVIEW.test(ua) ? "android-in-app" : "browser";
  if (IOS.test(ua)) return IN_APP_MARKERS.test(ua) || !IOS_BROWSER.test(ua) ? "ios-in-app" : "browser";
  return "browser";
}

/** Android: open the page in Chrome; if Chrome is missing, Android opens the plain https fallback (default: the same page). */
export function chromeIntentUrl(target: string, fallback: string = target): string {
  const url = new URL(target);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

/** iOS: the scheme Safari registers to open an https page from another app. */
export const safariUrl = (target: string): string => target.replace(/^https:\/\//, "x-safari-https://");

// Link-preview fetchers by their documented User-Agent names (Meta/Instagram, Telegram, WhatsApp, X, Slack, Discord,
// LinkedIn, Pinterest, search engines). A plain "bot" match is avoided: some phone brands (e.g. Cubot) contain it.
const LINK_PREVIEW_MARKERS = /facebookexternalhit|facebookcatalog|meta-externalagent|TelegramBot|WhatsApp\/|Twitterbot|Slackbot|Discordbot|LinkedInBot|Pinterestbot|Googlebot|bingbot|Applebot|redditbot|SkypeUriPreview|Embedly/i;

/** True for a server that only fetches the link to draw its preview card, never a buyer. */
export const isLinkPreview = (userAgent: string | null): boolean => LINK_PREVIEW_MARKERS.test(userAgent ?? "");
