// The files in the R2 bucket (key → hash, size, download name), written by tools/upload_files.ts.
import data from "./files.json";

export interface FileEntry { sha256: string; size: number; filename: string }
export type FileManifest = Record<string, FileEntry>;

export const FILE_MANIFEST: FileManifest = data as FileManifest;
