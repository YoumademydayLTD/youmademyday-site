// Build the server-side price catalog for the payment worker from the site's own data files.
// The site files are the single source of truth for prices (owner, 04.11.2026); the worker never trusts an
// amount from the browser, so it gets this generated copy bundled in. Run: node tools/build_catalog.ts
// (or `npm run catalog` in worker/). tools/polar_sync.ts reads the same file to create the Polar products.
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_JS = join(ROOT, "site", "js");
export const CATALOG_PATH = join(ROOT, "worker", "src", "catalog", "catalog.json");
// Hebrew is the source catalogue: its titles name the Polar products and it lists every item.
const SOURCE_LANG = "he";

interface SiteProduct { id: string; n: number; type: string; title: string; sub: string; price: number; usd?: number; includes?: string[] }
interface SitePlan { id: string; price: number; usd?: number; period: "week" | "month"; trialDays?: number }

export interface CatalogProduct {
  n: number; // the file number: content/dist/<NN>-*.pdf
  type: string;
  title: string;
  description: string;
  price: number;
  usd?: number;
  langs: string[];
  titles: Record<string, string>; // title on each site that sells it
  includes?: string[]; // bundles: the items delivered
}
export interface CatalogPlan { title: string; titles: Record<string, string>; description: string; price: number; usd?: number; period: "week" | "month"; trialDays: number }
export interface Business { name: string; id: string; addr: string; email: string }
export interface Catalog { langs: string[]; defaultLang: string; homeCurrencyLang: string; bookDealMin: number; refundDays: number; business: Record<string, Business>; products: Record<string, CatalogProduct>; plans: Record<string, CatalogPlan> }

const importSite = async <T>(relative: string): Promise<T> => (await import(pathToFileURL(join(SITE_JS, relative)).href)) as T;

async function productsOf(lang: string): Promise<SiteProduct[]> {
  return (await importSite<{ PRODUCTS: SiteProduct[] }>(`products/${lang}.js`)).PRODUCTS;
}

async function buildProducts(langs: string[]): Promise<Record<string, CatalogProduct>> {
  const byLang = new Map<string, Map<string, SiteProduct>>();
  for (const lang of langs) byLang.set(lang, new Map((await productsOf(lang)).map((p) => [p.id, p])));
  const products: Record<string, CatalogProduct> = {};
  for (const p of await productsOf(SOURCE_LANG)) {
    const sellsIn = langs.filter((lang) => byLang.get(lang)?.has(p.id));
    const titles = Object.fromEntries(sellsIn.map((lang) => [lang, byLang.get(lang)?.get(p.id)?.title ?? p.title]));
    products[p.id] = {
      n: p.n, type: p.type, title: p.title, description: p.sub, price: p.price, ...(p.usd != null ? { usd: p.usd } : {}),
      langs: sellsIn, titles, ...(p.includes ? { includes: p.includes } : {}),
    };
  }
  return products;
}

async function buildPlans(langs: string[]): Promise<Record<string, CatalogPlan>> {
  const { ALL_PLANS } = await importSite<{ ALL_PLANS: Record<string, SitePlan> }>("telegram/plans.js");
  const ui = (await importSite<{ default: Record<string, unknown> }>(`i18n/${SOURCE_LANG}/ui.js`)).default;
  const text = (key: string): string => (typeof ui[key] === "string" ? (ui[key] as string) : "");
  const list = (key: string): string[] => (Array.isArray(ui[key]) ? (ui[key] as unknown[]).map(String) : []);
  const uiOf = new Map<string, Record<string, unknown>>();
  for (const lang of langs) uiOf.set(lang, (await importSite<{ default: Record<string, unknown> }>(`i18n/${lang}/ui.js`)).default);
  const titleIn = (lang: string, id: string): string => {
    const dict = uiOf.get(lang) ?? {};
    // A plan's own full title wins over the "membership of {name}" template (owner 04.11: the Maximum is «המקסימום»).
    const own = dict[`plan.${id}.title`];
    if (typeof own === "string" && own) return own;
    return String(dict["buy.planTitle"] ?? "{name}").replace("{name}", String(dict[`plan.${id}.name`] ?? id));
  };
  const plans: Record<string, CatalogPlan> = {};
  for (const plan of Object.values(ALL_PLANS)) {
    if (!plan.price) continue; // free plans are not sold
    plans[plan.id] = {
      title: titleIn(SOURCE_LANG, plan.id),
      titles: Object.fromEntries(langs.map((lang) => [lang, titleIn(lang, plan.id)])),
      description: text(`plan.${plan.id}.sub`) || list(`plan.${plan.id}.items`).join(" · "),
      price: plan.price,
      ...(plan.usd != null ? { usd: plan.usd } : {}),
      period: plan.period,
      trialDays: plan.trialDays ?? 0,
    };
  }
  return plans;
}

export async function buildCatalog(): Promise<Catalog> {
  const { BOOK_DEAL_MIN, REFUND_DAYS, BIZ_FOR } = await importSite<{ BOOK_DEAL_MIN: number; REFUND_DAYS: number; BIZ_FOR: (lang: string) => Business }>("business.js");
  const { LIVE, DEFAULT_LANG, HOME_CURRENCY_LANG } = await importSite<{ LIVE: string[]; DEFAULT_LANG: string; HOME_CURRENCY_LANG: string }>("i18n/config.js");
  return {
    langs: LIVE, defaultLang: DEFAULT_LANG, homeCurrencyLang: HOME_CURRENCY_LANG, bookDealMin: BOOK_DEAL_MIN, refundDays: REFUND_DAYS,
    // Company details per site language, for the order details document (the disclosure document the law requires).
    business: Object.fromEntries(LIVE.map((lang) => {
      const { name, id, addr, email } = BIZ_FOR(lang);
      return [lang, { name, id, addr, email }];
    })),
    products: await buildProducts(LIVE), plans: await buildPlans(LIVE),
  };
}

export const serialize = (catalog: Catalog): string => `${JSON.stringify(catalog, null, 1)}\n`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const catalog = await buildCatalog();
  writeFileSync(CATALOG_PATH, serialize(catalog));
  console.log(`catalog: ${Object.keys(catalog.products).length} products, ${Object.keys(catalog.plans).length} plans → worker/src/catalog/catalog.json`);
}
