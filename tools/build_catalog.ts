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
export interface CatalogPlan { title: string; description: string; price: number; usd?: number; period: "week" | "month"; trialDays: number }
export interface Catalog { langs: string[]; defaultLang: string; homeCurrencyLang: string; bookDealMin: number; products: Record<string, CatalogProduct>; plans: Record<string, CatalogPlan> }

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

async function buildPlans(): Promise<Record<string, CatalogPlan>> {
  const { ALL_PLANS } = await importSite<{ ALL_PLANS: Record<string, SitePlan> }>("telegram/plans.js");
  const ui = (await importSite<{ default: Record<string, unknown> }>(`i18n/${SOURCE_LANG}/ui.js`)).default;
  const text = (key: string): string => (typeof ui[key] === "string" ? (ui[key] as string) : "");
  const list = (key: string): string[] => (Array.isArray(ui[key]) ? (ui[key] as unknown[]).map(String) : []);
  const plans: Record<string, CatalogPlan> = {};
  for (const plan of Object.values(ALL_PLANS)) {
    if (!plan.price) continue; // free plans are not sold
    plans[plan.id] = {
      title: text("buy.planTitle").replace("{name}", text(`plan.${plan.id}.name`)),
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
  const { BOOK_DEAL_MIN } = await importSite<{ BOOK_DEAL_MIN: number }>("business.js");
  const { LIVE, DEFAULT_LANG, HOME_CURRENCY_LANG } = await importSite<{ LIVE: string[]; DEFAULT_LANG: string; HOME_CURRENCY_LANG: string }>("i18n/config.js");
  return {
    langs: LIVE, defaultLang: DEFAULT_LANG, homeCurrencyLang: HOME_CURRENCY_LANG, bookDealMin: BOOK_DEAL_MIN,
    products: await buildProducts(LIVE), plans: await buildPlans(),
  };
}

export const serialize = (catalog: Catalog): string => `${JSON.stringify(catalog, null, 1)}\n`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const catalog = await buildCatalog();
  writeFileSync(CATALOG_PATH, serialize(catalog));
  console.log(`catalog: ${Object.keys(catalog.products).length} products, ${Object.keys(catalog.plans).length} plans → worker/src/catalog/catalog.json`);
}
