import type { Attachment } from "@/lib/types";

export function attachmentUrl(file: Attachment, options?: { download?: boolean }) {
  if (file.dataUrl) return file.dataUrl;
  if (!file.storagePath) return "";
  const params = new URLSearchParams({ path: file.storagePath });
  if (options?.download) params.set("download", "1");
  return `/api/attachments?${params.toString()}`;
}

export function isPdfAttachment(file: { type?: string; name?: string }) {
  return (
    (file.type ?? "").includes("pdf") ||
    (file.name ?? "").toLowerCase().endsWith(".pdf")
  );
}

export function attachmentFrameClass(file: { type?: string; name?: string }) {
  return isPdfAttachment(file)
    ? "border border-solid border-[#f97316]"
    : "border border-solid border-[#38bdf8]";
}
