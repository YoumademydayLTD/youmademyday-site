// What a customer sent (pure): text or caption, and the media file if any. The largest photo size is kept.
import type { TgMessage } from "../telegram/types.ts";
import type { MediaKind } from "./repo.ts";

export interface Extracted { text: string; mediaKind: MediaKind | null; fileId: string | null; fileName: string | null }

export function extractMedia(message: TgMessage): Extracted {
  const text = message.text ?? message.caption ?? "";
  const photo = message.photo?.at(-1);
  if (photo) return { text, mediaKind: "photo", fileId: photo.file_id, fileName: null };
  if (message.document) return { text, mediaKind: "document", fileId: message.document.file_id, fileName: message.document.file_name ?? null };
  if (message.voice) return { text, mediaKind: "voice", fileId: message.voice.file_id, fileName: null };
  if (message.video) return { text, mediaKind: "video", fileId: message.video.file_id, fileName: message.video.file_name ?? null };
  if (message.sticker) return { text: message.sticker.emoji ?? text, mediaKind: "sticker", fileId: message.sticker.file_id, fileName: null };
  return { text, mediaKind: null, fileId: null, fileName: null };
}
