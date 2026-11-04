// Create or update the store's products on Polar from the site catalogue, then write the id mapping the
// worker uses (worker/src/polar/products.json). Idempotent: a second run changes nothing.
// Only products whose metadata carries ymd_id are ours; the owner's own products are never touched.
// Run: node tools/polar_sync.ts [--dry-run]   (token: POLAR_ACCESS_TOKEN from the env or Site/.env)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCatalog, CATALOG_PATH, serialize } from "./build_catalog.ts";
import { listAll, polar, PolarError, ROOT } from "./polar/api.ts";
import { productSpecs, YMD_ID_KEY } from "./polar/specs.ts";
import { diffProduct, mapProduct, type MappedProduct, type PolarProduct } from "./polar/diff.ts";

const MAPPING_PATH = join(ROOT, "worker", "src", "polar", "products.json");
const isDryRun = process.argv.includes("--dry-run");

async function ourProducts(): Promise<Map<string, PolarProduct>> {
  const byYmdId = new Map<string, PolarProduct>();
  for (const product of await listAll<PolarProduct>("/products/")) {
    const ymdId = product.metadata[YMD_ID_KEY];
    if (typeof ymdId !== "string") continue; // not ours
    if (byYmdId.has(ymdId)) throw new Error(`two Polar products carry ymd_id ${ymdId}: ${byYmdId.get(ymdId)?.id} and ${product.id}; archive one by hand`);
    byYmdId.set(ymdId, product);
  }
  return byYmdId;
}

async function main(): Promise<void> {
  const catalog = await buildCatalog();
  writeFileSync(CATALOG_PATH, serialize(catalog));
  const existing = await ourProducts();
  const mapping: Record<string, MappedProduct> = {};
  const counts = { created: 0, updated: 0, same: 0 };
  for (const spec of productSpecs(catalog)) {
    const action = diffProduct(spec, existing.get(spec.ymdId));
    if (action.kind === "error") throw new Error(action.message);
    if (isDryRun) { console.log(`${spec.ymdId}: ${action.kind}${action.kind === "update" ? ` (${action.changed.join(", ")})` : ""}`); continue; }
    let product: PolarProduct;
    if (action.kind === "create") { product = await polar<PolarProduct>("POST", "/products/", action.body); counts.created += 1; }
    else if (action.kind === "update") { product = await polar<PolarProduct>("PATCH", `/products/${action.id}`, action.body); counts.updated += 1; console.log(`${spec.ymdId}: updated ${action.changed.join(", ")}`); }
    else { product = existing.get(spec.ymdId) as PolarProduct; counts.same += 1; }
    mapping[spec.ymdId] = mapProduct(spec, product);
  }
  if (isDryRun) return;
  writeFileSync(MAPPING_PATH, `${JSON.stringify(mapping, null, 1)}\n`);
  console.log(`polar sync: ${counts.created} created, ${counts.updated} updated, ${counts.same} unchanged → worker/src/polar/products.json`);
}

try {
  await main();
} catch (error) {
  if (error instanceof PolarError && error.isMissingScope) console.error(`Polar refused (403, missing token scope) on ${error.path}: ${error.body}`);
  else console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
