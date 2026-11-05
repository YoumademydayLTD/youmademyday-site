// Attach a PDF to one of our Polar products as a downloadable benefit, so the buyer gets the file on Polar's
// confirmation page and in the customer portal. Idempotent per file hash: a file already uploaded (same name and
// sha256 in the benefit's metadata) is reused; an existing benefit on the product is kept, never removed.
// Run: node tools/polar_benefit_file.ts <store id> <pdf path> "<benefit description, 3–42 chars>"
// Token: POLAR_ACCESS_TOKEN from the env or Site/.env (never printed).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { listAll, polar, PolarError, ROOT } from "./polar/api.ts";

const MAPPING_PATH = join(ROOT, "worker", "src", "polar", "products.json");
const MIME_PDF = "application/pdf";
const SINGLE_PART = 1;
const BENEFIT_DESCRIPTION_MAX = 42;
const HASH_KEY = "ymd_sha256";

interface UploadPart { number: number; url: string; headers: Record<string, string> }
interface FileUpload { id: string; upload: { id: string; path: string; parts: UploadPart[] } }
interface Benefit { id: string; type: string; description: string; metadata: Record<string, string | number | boolean> }
interface Product { id: string; benefits: { id: string }[] }

interface Args { storeId: string; pdfPath: string; description: string }
function parseArgs(argv: readonly string[]): Args {
  const [storeId, pdfPath, description] = argv;
  if (!storeId || !pdfPath || !description) throw new Error("usage: node tools/polar_benefit_file.ts <store id> <pdf path> <benefit description>");
  if (description.length > BENEFIT_DESCRIPTION_MAX) throw new Error(`the benefit description is over ${BENEFIT_DESCRIPTION_MAX} characters`);
  return { storeId, pdfPath, description };
}
const { storeId, pdfPath, description } = parseArgs(process.argv.slice(2));

const mapping = JSON.parse(readFileSync(MAPPING_PATH, "utf8")) as Record<string, { productId: string }>;
const productId = mapping[storeId]?.productId;
if (!productId) throw new Error(`${storeId} is not in ${MAPPING_PATH}; run npm run sync first`);

const bytes = readFileSync(pdfPath);
const sha256Base64 = createHash("sha256").update(bytes).digest("base64");
const sha256Hex = createHash("sha256").update(bytes).digest("hex");

async function uploadFile(): Promise<string> {
  const created = await polar<FileUpload>("POST", "/files/", {
    name: basename(pdfPath), mime_type: MIME_PDF, size: bytes.length, service: "downloadable", checksum_sha256_base64: sha256Base64,
    upload: { parts: [{ number: SINGLE_PART, chunk_start: 0, chunk_end: bytes.length, checksum_sha256_base64: sha256Base64 }] },
  });
  const part = created.upload.parts[0];
  if (!part) throw new Error("Polar returned no upload part");
  const put = await fetch(part.url, { method: "PUT", headers: { ...part.headers, "Content-Type": MIME_PDF }, body: bytes });
  if (!put.ok) throw new Error(`upload PUT failed: ${put.status} ${(await put.text()).slice(0, 300)}`);
  const etag = put.headers.get("etag");
  if (!etag) throw new Error("the upload reply carried no ETag");
  await polar("POST", `/files/${created.id}/uploaded`, {
    id: created.upload.id, path: created.upload.path, parts: [{ number: SINGLE_PART, checksum_etag: etag, checksum_sha256_base64: sha256Base64 }],
  });
  return created.id;
}

async function main(): Promise<void> {
  const benefits = await listAll<Benefit>("/benefits/?type=downloadables");
  let benefit = benefits.find((b) => b.metadata[HASH_KEY] === sha256Hex && b.description === description);
  if (benefit) console.log(`benefit reused: ${benefit.id}`);
  else {
    const fileId = await uploadFile();
    console.log(`file uploaded: ${fileId} (${bytes.length} bytes)`);
    benefit = await polar<Benefit>("POST", "/benefits/", {
      type: "downloadables", description, properties: { files: [fileId] }, metadata: { ymd_id: storeId, [HASH_KEY]: sha256Hex },
    });
    console.log(`benefit created: ${benefit.id}`);
  }
  const product = await polar<Product>("GET", `/products/${productId}`);
  const ids = new Set(product.benefits.map((b) => b.id));
  if (ids.has(benefit.id)) { console.log(`already on ${storeId} (${productId})`); return; }
  ids.add(benefit.id);
  await polar("POST", `/products/${productId}/benefits`, { benefits: [...ids] });
  console.log(`attached to ${storeId} (${productId}); the product now has ${ids.size} benefit(s)`);
}

try {
  await main();
} catch (error) {
  if (error instanceof PolarError && error.isMissingScope) console.error(`Polar refused (403, missing token scope) on ${error.path}: ${error.body}`);
  else console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
