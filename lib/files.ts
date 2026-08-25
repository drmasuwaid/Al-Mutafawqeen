import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { adminBucket } from "@/lib/firebase-admin";
import type { Attachment } from "@/lib/types";

const LEGACY_ROOT = path.join(process.cwd(), "data", "attachments");

function safeName(name: string) {
  return name.replace(/[^\w.\u0600-\u06FF-]+/g, "_").slice(0, 80) || "file";
}

export function homeworkIdFromStoragePath(storagePath: string) {
  const parts = storagePath.split("/").filter(Boolean);
  if (parts[0] === "homework" && parts[1]) return parts[1];
  return parts[0] ?? "";
}

export function attachmentUrl(file: Attachment, options?: { download?: boolean }) {
  if (file.dataUrl) return file.dataUrl;
  if (!file.storagePath) return "";
  const params = new URLSearchParams({ path: file.storagePath });
  if (options?.download) params.set("download", "1");
  return `/api/attachments?${params.toString()}`;
}

function objectPath(homeworkId: string, filename: string) {
  return `homework/${homeworkId}/${filename}`;
}

export async function saveHomeworkFiles(
  homeworkId: string,
  files: File[]
): Promise<Attachment[]> {
  const bucket = adminBucket();
  const saved: Attachment[] = [];
  for (const file of files) {
    const filename = `${Date.now()}-${safeName(file.name)}`;
    const storagePath = objectPath(homeworkId, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    const type = file.type || "application/octet-stream";
    await bucket.file(storagePath).save(buffer, {
      resumable: false,
      contentType: type,
      metadata: {
        contentType: type,
        metadata: {
          originalName: file.name,
          homeworkId,
        },
      },
    });
    saved.push({
      name: file.name,
      type,
      size: file.size,
      storagePath,
    });
  }
  return saved;
}

async function readLegacyDisk(storagePath: string) {
  const root = path.resolve(LEGACY_ROOT);
  const full = path.resolve(LEGACY_ROOT, storagePath.replace(/^homework\//, ""));
  if (!full.startsWith(root + path.sep) && full !== root) throw new Error("Invalid path");
  return readFile(full);
}

export async function readStoredFile(storagePath: string) {
  try {
    const [buffer] = await adminBucket().file(storagePath).download();
    return buffer;
  } catch (error) {
    try {
      return await readLegacyDisk(storagePath);
    } catch {
      throw error;
    }
  }
}

export async function deleteHomeworkFiles(attachments: Attachment[] | undefined) {
  const bucket = adminBucket();
  for (const file of attachments ?? []) {
    if (!file.storagePath) continue;
    try {
      await bucket.file(file.storagePath).delete({ ignoreNotFound: true });
    } catch {
      /* already gone */
    }
    try {
      await unlink(path.join(LEGACY_ROOT, file.storagePath.replace(/^homework\//, "")));
    } catch {
      /* already gone */
    }
  }
}

export async function syncHomeworkAttachments(
  homeworkId: string,
  previous: Attachment[],
  keep: Attachment[],
  files: File[]
) {
  const uploaded = files.length ? await saveHomeworkFiles(homeworkId, files) : [];
  const next = [...keep, ...uploaded];
  const keepPaths = new Set(next.map((item) => item.storagePath).filter(Boolean) as string[]);
  const removed = previous.filter(
    (item) => item.storagePath && !keepPaths.has(item.storagePath)
  );
  await deleteHomeworkFiles(removed);
  return next;
}
