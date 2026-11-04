// Content type and download name for a proxied support file (pure).
import type { MediaKind } from "../support/repo.ts";

const BY_KIND: Record<MediaKind, string> = { photo: "image/jpeg", voice: "audio/ogg", video: "video/mp4", sticker: "image/webp", document: "application/octet-stream" };
const BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", heic: "image/heic",
  txt: "text/plain; charset=utf-8", mp4: "video/mp4", mov: "video/quicktime", mp3: "audio/mpeg", ogg: "audio/ogg", zip: "application/zip",
};

export function mediaType(file: { mediaKind: MediaKind; fileName: string | null }): string {
  const extension = file.fileName?.split(".").pop()?.toLowerCase() ?? "";
  return (file.mediaKind === "document" && BY_EXTENSION[extension]) || BY_KIND[file.mediaKind];
}

/** Content-Disposition with an ASCII name plus the RFC 5987 UTF-8 form (same rule as the store worker). */
export const attachment = (filename: string): string =>
  `attachment; filename="${filename.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
