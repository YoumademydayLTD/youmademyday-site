// A thin Bot API client: JSON calls, multipart uploads and typed failures (rate limit, blocked, other).
const API_BASE = "https://api.telegram.org";
const HTTP_TOO_MANY = 429;
const HTTP_FORBIDDEN = 403;

interface ApiReply<T> { ok: boolean; result?: T; description?: string; error_code?: number; parameters?: { retry_after?: number } }

export class TelegramError extends Error {
  readonly code: number;
  readonly retryAfter: number | null;
  constructor(method: string, code: number, description: string, retryAfter: number | null) {
    super(`${method}: ${code} ${description}`);
    this.code = code;
    this.retryAfter = retryAfter;
  }
  get isRateLimit(): boolean { return this.code === HTTP_TOO_MANY; }
  /** The user blocked the bot or deleted the account: stop writing to this chat. */
  get isBlocked(): boolean { return this.code === HTTP_FORBIDDEN; }
}

export interface Telegram {
  call<T>(method: string, params: Record<string, unknown>): Promise<T>;
  upload<T>(method: string, form: FormData): Promise<T>;
  /** Downloads a file by id (the URL holds the token, so it never leaves the worker). */
  download(fileId: string): Promise<Response>;
}

async function unwrap<T>(method: string, response: Response): Promise<T> {
  let reply: ApiReply<T>;
  try {
    reply = await response.json<ApiReply<T>>();
  } catch {
    throw new TelegramError(method, response.status, "reply is not JSON", null);
  }
  if (!reply.ok || reply.result === undefined) {
    throw new TelegramError(method, reply.error_code ?? response.status, reply.description ?? "unknown error", reply.parameters?.retry_after ?? null);
  }
  return reply.result;
}

export function createTelegram(token: string, fetcher: typeof fetch = fetch): Telegram {
  const url = (method: string) => `${API_BASE}/bot${token}/${method}`;
  return {
    async call<T>(method: string, params: Record<string, unknown>): Promise<T> {
      const response = await fetcher(url(method), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
      return unwrap<T>(method, response);
    },
    async upload<T>(method: string, form: FormData): Promise<T> {
      return unwrap<T>(method, await fetcher(url(method), { method: "POST", body: form }));
    },
    async download(fileId: string): Promise<Response> {
      const file = await this.call<{ file_path?: string }>("getFile", { file_id: fileId });
      if (!file.file_path) throw new TelegramError("getFile", 0, "no file path", null);
      return fetcher(`${API_BASE}/file/bot${token}/${file.file_path}`);
    },
  };
}
