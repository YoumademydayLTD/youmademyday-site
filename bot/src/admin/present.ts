// The JSON shapes the support center reads (see README.md: Thread, Message, UserCard).
import type { BotUser } from "../users/repo.ts";
import { displayName } from "../users/repo.ts";
import type { MessageRow, ThreadRow } from "../support/repo.ts";

export interface ThreadUser { id: number; name: string; username: string | null; lang: string }
export interface ThreadJson { id: number; status: string; unread: number; lastText: string; lastAt: string; createdAt: string; user: ThreadUser }

export const threadUser = (user: BotUser | null, telegramId: number): ThreadUser =>
  user ? { id: user.telegramId, name: displayName(user), username: user.username, lang: user.lang } : { id: telegramId, name: String(telegramId), username: null, lang: "" };

export const threadJson = (thread: ThreadRow, user: BotUser | null): ThreadJson => ({
  id: thread.id, status: thread.status, unread: thread.unread, lastText: thread.lastText, lastAt: thread.lastAt, createdAt: thread.createdAt,
  user: threadUser(user, thread.telegramId),
});

export const messageJson = (m: MessageRow) => ({ id: m.id, threadId: m.threadId, direction: m.direction, text: m.text, mediaKind: m.mediaKind, fileId: m.fileId, fileName: m.fileName, createdAt: m.createdAt });

export const userCard = (u: BotUser) => ({
  id: u.telegramId, name: displayName(u), username: u.username, lang: u.lang, createdAt: u.createdAt, timeZone: u.timeZone, dailyHour: u.dailyHour,
  dailyPaused: u.dailyPaused, dailySilent: u.dailySilent, newsOptIn: u.newsOptIn, track: u.track, trackDay: u.trackDay, streak: u.streak, isBlocked: u.isBlocked,
});
