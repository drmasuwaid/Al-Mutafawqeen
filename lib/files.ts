import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Attachment } from "@/lib/types";

const ROOT = path.join(process.cwd(), "data", "attachments");

function safeName(name: string) {
  return name.replace(/[^\w.\u0600-\u06FF-]+/g, "_").slice(0, 80) || "file";
}

export function attachmentUrl(file: Attachment, options?: { download?: boolean }) {
  if (file.dataUrl) return file.dataUrl;
  if (!file.storagePath) return "";
  const params = new URLSearchParams({ path: file.storagePath });
  if (options?.download) params.set("download", "1");
  return `/api/attachments?${params.toString()}`;
}

export async function saveHomeworkFiles(
  homeworkId: string,
  files: File[]
): Promise<Attachment[]> {
  const dir = path.join(ROOT, homeworkId);
  await mkdir(dir, { recursive: true });
  const saved: Attachment[] = [];
  for (const file of files) {
    const filename = `${Date.now()}-${safeName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    saved.push({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      storagePath: `${homeworkId}/${filename}`,
    });
  }
  return saved;
}

export async function readStoredFile(storagePath: string) {
  const root = path.resolve(ROOT);
  const full = path.resolve(ROOT, storagePath);
  if (!full.startsWith(root + path.sep) && full !== root) throw new Error("Invalid path");
  return readFile(full);
}

export async function deleteHomeworkFiles(attachments: Attachment[] | undefined) {
  for (const file of attachments ?? []) {
    if (!file.storagePath) continue;
    try {
      await unlink(path.join(ROOT, file.storagePath));
    } catch {
      /* already gone */
    }
  }
}
