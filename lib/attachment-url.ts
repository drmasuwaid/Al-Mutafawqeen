import type { Attachment } from "@/lib/types";

export function attachmentUrl(file: Attachment, options?: { download?: boolean }) {
  if (file.dataUrl) return file.dataUrl;
  if (!file.storagePath) return "";
  const params = new URLSearchParams({ path: file.storagePath });
  if (options?.download) params.set("download", "1");
  return `/api/attachments?${params.toString()}`;
}

export function attachmentFrameClass() {
  return "border-[1.5px] border-solid border-[#38bdf8]";
}
