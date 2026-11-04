// Support-center endpoints for the daily messages (content planning) and quick replies.
import type { AppContext } from "../app/context.ts";
import { HttpError } from "../http/errors.ts";
import { readJsonObject, requireInteger, requireString } from "../http/response.ts";
import { deleteContent, listContent, saveContent } from "../content/repo.ts";
import { findTrack, isFreeTrack, TRACKS } from "../config/tracks.ts";
import { isLang, LANGS } from "../config/langs.ts";

const MAX_TEXT = 4000;
const MAX_DAY = 366;
const MAX_LABEL = 60;
const MAX_URL = 500;
const MAX_QUICK_REPLY = 1000;

export async function getContent(request: Request, ctx: AppContext): Promise<unknown> {
  const params = new URL(request.url).searchParams;
  const filter = { ...(params.get("track") ? { track: params.get("track") ?? "" } : {}), ...(params.get("lang") ? { lang: params.get("lang") ?? "" } : {}) };
  return {
    tracks: TRACKS.map((track) => ({ id: track.id, access: track.plans, isFree: isFreeTrack(track) })),
    langs: LANGS,
    items: await listContent(ctx.db, filter),
  };
}

function optionalText(body: Record<string, unknown>, field: string, max: number): string | null {
  const value = body[field];
  if (value === undefined || value === null || value === "") return null;
  return requireString(body, field, max);
}

export async function postContent(request: Request, ctx: AppContext): Promise<unknown> {
  const body = await readJsonObject(request);
  const track = requireString(body, "track", MAX_LABEL);
  const lang = requireString(body, "lang", MAX_LABEL);
  if (!findTrack(track)) throw new HttpError("bad_request", "unknown track");
  if (!isLang(lang)) throw new HttpError("bad_request", "unknown language");
  const lessonUrl = optionalText(body, "lessonUrl", MAX_URL);
  if (lessonUrl && !/^https:\/\//.test(lessonUrl)) throw new HttpError("bad_request", "the lesson link must start with https://");
  const id = body.id === undefined || body.id === null ? undefined : requireInteger(body, "id", 1, Number.MAX_SAFE_INTEGER);
  const input = { track, lang, dayN: requireInteger(body, "dayN", 1, MAX_DAY), text: requireString(body, "text", MAX_TEXT), lessonUrl, lessonLabel: optionalText(body, "lessonLabel", MAX_LABEL) };
  return { item: await saveContent(ctx.db, id === undefined ? input : { ...input, id }, ctx.nowIso) };
}

export async function postContentDelete(ctx: AppContext, id: number): Promise<unknown> {
  if (!(await deleteContent(ctx.db, id))) throw new HttpError("not_found", "no such message");
  return { ok: true };
}

export async function getQuickReplies(ctx: AppContext): Promise<unknown> {
  const { results } = await ctx.db.prepare("SELECT id, text FROM bot_quick_replies ORDER BY position, id").all<{ id: number; text: string }>();
  return { replies: results };
}

export async function postQuickReply(request: Request, ctx: AppContext): Promise<unknown> {
  const text = requireString(await readJsonObject(request), "text", MAX_QUICK_REPLY);
  const reply = await ctx.db.prepare("INSERT INTO bot_quick_replies (text, position) VALUES (?, (SELECT COALESCE(MAX(position), 0) + 1 FROM bot_quick_replies)) RETURNING id, text")
    .bind(text).first<{ id: number; text: string }>();
  return { reply };
}

export async function postQuickReplyDelete(ctx: AppContext, id: number): Promise<unknown> {
  await ctx.db.prepare("DELETE FROM bot_quick_replies WHERE id = ?").bind(id).run();
  return { ok: true };
}
