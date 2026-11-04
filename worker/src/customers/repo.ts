// The customers table: our customer per Telegram user and its Polar customer id.
import { formatYm } from "./ym.ts";

export interface Customer { id: number; ym: string; telegramId: number; polarCustomerId: string | null; country: string | null }
interface Row { id: number; ym: string | null; telegram_id: number; polar_customer_id: string | null; country: string | null }

const fromRow = (r: Row): Customer => ({ id: r.id, ym: r.ym ?? formatYm(r.id), telegramId: r.telegram_id, polarCustomerId: r.polar_customer_id, country: r.country });

export async function findCustomerByTelegram(db: D1Database, telegramId: number): Promise<Customer | null> {
  const row = await db.prepare("SELECT id, ym, telegram_id, polar_customer_id, country FROM customers WHERE telegram_id = ?").bind(telegramId).first<Row>();
  return row ? fromRow(row) : null;
}

export async function findCustomerByYm(db: D1Database, ym: string): Promise<Customer | null> {
  const row = await db.prepare("SELECT id, ym, telegram_id, polar_customer_id, country FROM customers WHERE ym = ?").bind(ym).first<Row>();
  return row ? fromRow(row) : null;
}

/** The customer of a Telegram user, created with the next number the first time (safe to call concurrently). */
export async function ensureCustomer(db: D1Database, telegramId: number, now: string): Promise<Customer> {
  await db.prepare("INSERT INTO customers (telegram_id, created_at) VALUES (?, ?) ON CONFLICT(telegram_id) DO NOTHING").bind(telegramId, now).run();
  await db.prepare("UPDATE customers SET ym = 'ym' || printf('%04d', id) WHERE telegram_id = ? AND ym IS NULL").bind(telegramId).run();
  const customer = await findCustomerByTelegram(db, telegramId);
  if (!customer) throw new Error(`customer row for ${telegramId} was not created`);
  return customer;
}

export async function setPolarCustomer(db: D1Database, customerId: number, polarCustomerId: string): Promise<void> {
  await db.prepare("UPDATE customers SET polar_customer_id = ? WHERE id = ? AND polar_customer_id IS NULL").bind(polarCustomerId, customerId).run();
}

/** Saves the billing country the first time we learn it; a saved one is never overwritten. */
export async function saveCountry(db: D1Database, customerId: number, country: string): Promise<void> {
  await db.prepare("UPDATE customers SET country = ? WHERE id = ? AND country IS NULL").bind(country, customerId).run();
}
