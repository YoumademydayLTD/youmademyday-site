// Who a message is for (pure): a customer's message opens or continues their support thread; the admin's
// Telegram reply to a support notification goes to that thread's customer.
export interface IncomingContext {
  fromId: number;
  isAdmin: boolean;
  isCommand: boolean;
  replyToMessageId: number | null;
}

export type Route =
  | { kind: "command" }
  | { kind: "admin-reply"; noticeMessageId: number }
  | { kind: "admin-hint" }
  | { kind: "support" };

export function routeMessage(context: IncomingContext): Route {
  if (context.isCommand) return { kind: "command" };
  if (context.isAdmin) {
    // The admin's own chat is the team's desk: free text there is never a support request of his own.
    return context.replyToMessageId === null ? { kind: "admin-hint" } : { kind: "admin-reply", noticeMessageId: context.replyToMessageId };
  }
  return { kind: "support" };
}

/** A customer gets the auto-ack once per thread: on its first message, and again only after it was resolved and reopened. */
export const needsAck = (thread: { isAcked: boolean }): boolean => !thread.isAcked;

/** A one-line preview of a message for the inbox and the admin notification. */
export function preview(text: string, mediaKind: string | null, maxLength: number): string {
  const body = text.trim().replace(/\s+/g, " ");
  const label = mediaKind ? `[${mediaKind}]` : "";
  const full = [label, body].filter(Boolean).join(" ");
  return full.length > maxLength ? `${full.slice(0, maxLength - 1)}…` : full;
}
