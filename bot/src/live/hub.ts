// One Durable Object that holds the support center's open WebSocket tabs and pushes new messages to them,
// so /admin updates live without polling. It uses the hibernation API: idle sockets cost nothing.
import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env.ts";

export const HUB_NAME = "admin";
const PUBLISH_PATH = "/publish";
const SWITCHING_PROTOCOLS = 101;

export class AdminHub extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname === PUBLISH_PATH) {
      const event = await request.text();
      for (const socket of this.ctx.getWebSockets()) {
        try { socket.send(event); } catch { /* a closing socket: the browser reconnects on its own */ }
      }
      return new Response(null, { status: 204 });
    }
    if (request.headers.get("Upgrade") !== "websocket") return new Response("expected a WebSocket", { status: 426 });
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: SWITCHING_PROTOCOLS, webSocket: client });
  }

  // The browser only listens; a "ping" text keeps proxies from closing an idle socket.
  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (message === "ping") socket.send("pong");
  }

  override async webSocketClose(socket: WebSocket, code: number): Promise<void> {
    try { socket.close(code, "closed"); } catch { /* already closed */ }
  }
}

const hub = (env: Env) => env.HUB.get(env.HUB.idFromName(HUB_NAME));

/** Pushes an event to every open support-center tab. Never fails the caller: the inbox reloads on reconnect. */
export async function publish(env: Env, event: unknown): Promise<void> {
  try {
    await hub(env).fetch(`https://hub${PUBLISH_PATH}`, { method: "POST", body: JSON.stringify(event) });
  } catch (error) {
    console.error("live: publish failed", error instanceof Error ? error.message : String(error));
  }
}

/** Hands an authenticated WebSocket upgrade to the hub. */
export const connect = (env: Env, request: Request): Promise<Response> => hub(env).fetch(request);
