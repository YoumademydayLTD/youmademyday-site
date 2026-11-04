// Support threads and their messages (bot_threads, bot_messages, bot_admin_notices, bot_quick_replies).
export type ThreadStatus = "open" | "resolved";
export type MediaKind = "photo" | "document" | "voice" | "video" | "sticker";

export interface ThreadRow { id: number; telegramId: number; status: ThreadStatus; unread: number; isAcked: boolean; lastText: string; lastAt: string; createdAt: string }
export interface MessageRow { id: number; threadId: number; direction: "in" | "out"; text: string; mediaKind: MediaKind | null; fileId: string | null; fileName: string | null; createdAt: string }
export interface NewMessage { direction: "in" | "out"; text: string; mediaKind: MediaKind | null; fileId: string | null; fileName: string | null; telegramMessageId: number | null }

interface TRow { id: number; telegram_id: number; status: ThreadStatus; unread: number; is_acked: number; last_text: string; last_at: string; created_at: string }
interface MRow { id: number; thread_id: number; direction: "in" | "out"; text: string; media_kind: MediaKind | null; file_id: string | null; file_name: string | null; created_at: string }

const thread = (r: TRow): ThreadRow => ({ id: r.id, telegramId: r.telegram_id, status: r.status, unread: r.unread, isAcked: r.is_acked === 1, lastText: r.last_text, lastAt: r.last_at, createdAt: r.created_at });
const message = (r: MRow): MessageRow => ({ id: r.id, threadId: r.thread_id, direction: r.direction, text: r.text, mediaKind: r.media_kind, fileId: r.file_id, fileName: r.file_name, createdAt: r.created_at });

export async function findThread(db: D1Database, id: number): Promise<ThreadRow | null> {
  const row = await db.prepare("SELECT * FROM bot_threads WHERE id = ?").bind(id).first<TRow>();
  return row ? thread(row) : null;
}

/** The customer's latest thread, reopened if it was resolved (a new message is a new question). */
export async function openThreadFor(db: D1Database, telegramId: number, now: string): Promise<ThreadRow> {
  const latest = await db.prepare("SELECT * FROM bot_threads WHERE telegram_id = ? ORDER BY id DESC LIMIT 1").bind(telegramId).first<TRow>();
  if (latest?.status === "open") return thread(latest);
  const created = await db.prepare("INSERT INTO bot_threads (telegram_id, status, last_at, created_at) VALUES (?, 'open', ?, ?) RETURNING *").bind(telegramId, now, now).first<TRow>();
  if (!created) throw new Error("openThreadFor: no row");
  return thread(created);
}

export async function addMessage(db: D1Database, threadId: number, m: NewMessage, preview: string, now: string): Promise<{ message: MessageRow; thread: ThreadRow }> {
  const [inserted, updated] = await db.batch<MRow | TRow>([
    db.prepare(`INSERT INTO bot_messages (thread_id, direction, text, media_kind, file_id, file_name, telegram_message_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`).bind(threadId, m.direction, m.text, m.mediaKind, m.fileId, m.fileName, m.telegramMessageId, now),
    db.prepare(`UPDATE bot_threads SET last_text = ?, last_at = ?, unread = unread + ?, status = CASE WHEN ? = 'in' THEN 'open' ELSE status END
      WHERE id = ? RETURNING *`).bind(preview, now, m.direction === "in" ? 1 : 0, m.direction, threadId),
  ]);
  const mrow = inserted?.results[0] as MRow | undefined;
  const trow = updated?.results[0] as TRow | undefined;
  if (!mrow || !trow) throw new Error("addMessage: no row");
  return { message: message(mrow), thread: thread(trow) };
}

export async function markAcked(db: D1Database, threadId: number): Promise<void> {
  await db.prepare("UPDATE bot_threads SET is_acked = 1 WHERE id = ?").bind(threadId).run();
}

export async function markRead(db: D1Database, threadId: number): Promise<ThreadRow | null> {
  const row = await db.prepare("UPDATE bot_threads SET unread = 0 WHERE id = ? RETURNING *").bind(threadId).first<TRow>();
  return row ? thread(row) : null;
}

export async function setStatus(db: D1Database, threadId: number, status: ThreadStatus): Promise<ThreadRow | null> {
  // A resolved thread that the customer writes to again starts a new thread, which gets its own auto-ack.
  const row = await db.prepare("UPDATE bot_threads SET status = ?, unread = CASE WHEN ? = 'resolved' THEN 0 ELSE unread END WHERE id = ? RETURNING *")
    .bind(status, status, threadId).first<TRow>();
  return row ? thread(row) : null;
}

export async function listThreads(db: D1Database, status: ThreadStatus | "all", limit: number): Promise<ThreadRow[]> {
  const { results } = await db.prepare("SELECT * FROM bot_threads WHERE (?1 = 'all' OR status = ?1) ORDER BY unread > 0 DESC, last_at DESC LIMIT ?2")
    .bind(status, limit).all<TRow>();
  return results.map(thread);
}

export async function listMessages(db: D1Database, threadId: number): Promise<MessageRow[]> {
  const { results } = await db.prepare("SELECT * FROM bot_messages WHERE thread_id = ? ORDER BY id").bind(threadId).all<MRow>();
  return results.map(message);
}

export async function saveNotice(db: D1Database, adminChatId: number, messageId: number, threadId: number): Promise<void> {
  await db.prepare("INSERT OR REPLACE INTO bot_admin_notices (admin_chat_id, message_id, thread_id) VALUES (?, ?, ?)").bind(adminChatId, messageId, threadId).run();
}

export async function threadForNotice(db: D1Database, adminChatId: number, messageId: number): Promise<number | null> {
  const row = await db.prepare("SELECT thread_id FROM bot_admin_notices WHERE admin_chat_id = ? AND message_id = ?").bind(adminChatId, messageId).first<{ thread_id: number }>();
  return row?.thread_id ?? null;
}

/** The kind and name of a stored support file (the media proxy serves nothing else). */
export async function findFile(db: D1Database, fileId: string): Promise<{ mediaKind: MediaKind; fileName: string | null } | null> {
  const row = await db.prepare("SELECT media_kind, file_name FROM bot_messages WHERE file_id = ? LIMIT 1").bind(fileId).first<{ media_kind: MediaKind; file_name: string | null }>();
  return row ? { mediaKind: row.media_kind, fileName: row.file_name } : null;
}
