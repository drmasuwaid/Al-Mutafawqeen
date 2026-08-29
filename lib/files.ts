import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { adminBucket } from "@/lib/firebase-admin";
import type { Attachment } from "@/lib/types";

const LEGACY_ROOT = path.join(process.cwd(), "data", "attachments");
export const MAX_HOMEWORK_FILE_BYTES = 8 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function assertHomeworkFile(file: File) {
  if (file.size > MAX_HOMEWORK_FILE_BYTES) {
    throw new Error(`الملف ${file.name} أكبر من 8 ميجابايت`);
  }
  const name = file.name.toLowerCase();
  const typed =
    file.type.startsWith("image/") ||
    ALLOWED_FILE_TYPES.has(file.type);
  const named = /\.(pdf|doc|docx|png|jpe?g|gif|webp|heic|heif)$/i.test(name);
  if (!typed && !named) {
    throw new Error(`نوع الملف ${file.name} غير مسموح. ارفع صورة أو PDF أو مستنداً.`);
  }
}

function safeName(name: string) {
  return name.replace(/[^\w.\u0600-\u06FF-]+/g, "_").slice(0, 80) || "file";
}

export function sanitizeClientAttachments(items: Attachment[] | undefined): Attachment[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const name = String(item?.name || "file").slice(0, 180);
    const type = String(item?.type || "application/octet-stream");
    const size = Number(item?.size) || 0;
    const storagePath = String(item?.storagePath || "");
    const dataUrl = String(item?.dataUrl || "");
    if (storagePath && !storagePath.includes("..") && storagePath.startsWith("homework/")) {
      return [{ name, type, size, storagePath }];
    }
    if (/^data:(image\/[a-z0-9.+-]+|application\/pdf);/i.test(dataUrl)) {
      return [{ name, type, size, dataUrl }];
    }
    return [];
  });
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
    assertHomeworkFile(file);
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
