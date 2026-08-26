"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, FileText, X } from "lucide-react";
import { attachmentFrameClass, attachmentUrl } from "@/lib/attachment-url";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";

function isPdf(file: Attachment) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function AttachmentGallery({ attachments }: { attachments: Attachment[] }) {
  const images = attachments.filter((file) => file.type.startsWith("image/"));
  const docs = attachments.filter((file) => !file.type.startsWith("image/"));
  const [imageIndex, setImageIndex] = useState<number | null>(null);
  const [pdf, setPdf] = useState<Attachment | null>(null);

  const current = imageIndex !== null ? images[imageIndex] : null;

  if (!attachments.length) return null;

  return (
    <div className="mt-4 min-w-0 max-w-full space-y-3">
      {images.length ? (
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold text-slate-500">الصور ({images.length}):</p>
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
            {images.map((file, index) => (
              <button
                key={`${file.name}-${index}`}
                type="button"
                onClick={() => setImageIndex(index)}
                className={cn(
                  "h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white",
                  attachmentFrameClass()
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachmentUrl(file)}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {docs.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">الملفات ({docs.length}):</p>
          {docs.map((file, index) => {
            const previewable = isPdf(file);
            return (
              <div
                key={`${file.name}-${index}`}
                className={cn(
                  "flex min-w-0 flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between",
                  attachmentFrameClass()
                )}
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                  <FileText className="size-4 shrink-0 text-blue-500" />
                  <span className="min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                    {file.name}
                  </span>
                </span>
                <div className="flex shrink-0 gap-2">
                  {previewable ? (
                    <button
                      type="button"
                      className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg bg-blue-50 px-3 text-xs font-bold text-blue-700 sm:flex-none"
                      onClick={() => setPdf(file)}
                    >
                      <Eye className="size-3.5" />
                      معاينة
                    </button>
                  ) : null}
                  <a
                    className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg bg-white px-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200 sm:flex-none"
                    href={attachmentUrl(file, { download: true })}
                    download={file.name}
                  >
                    <Download className="size-3.5" />
                    تحميل
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {current ? (
        <Lightbox
          title={current.name}
          onClose={() => setImageIndex(null)}
          onPrev={() => setImageIndex((index) => (index === null ? 0 : (index + images.length - 1) % images.length))}
          onNext={() => setImageIndex((index) => (index === null ? 0 : (index + 1) % images.length))}
          downloadHref={attachmentUrl(current, { download: true })}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachmentUrl(current)} alt={current.name} className={cn("max-h-[70vh] max-w-full object-contain", attachmentFrameClass())} />
        </Lightbox>
      ) : null}

      {pdf ? (
        <Lightbox
          title={pdf.name}
          onClose={() => setPdf(null)}
          downloadHref={attachmentUrl(pdf, { download: true })}
        >
          <iframe
            title={pdf.name}
            src={attachmentUrl(pdf)}
            className={cn("h-[70vh] w-full rounded-xl bg-white", attachmentFrameClass())}
          />
        </Lightbox>
      ) : null}
    </div>
  );
}

function Lightbox({
  title,
  children,
  onClose,
  onPrev,
  onNext,
  downloadHref,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  downloadHref: string;
}) {
  const showNav = Boolean(onPrev && onNext);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-3" onClick={onClose}>
      <div
        className="relative flex max-h-[94dvh] w-full max-w-3xl flex-col rounded-2xl bg-slate-900 p-3 text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-bold">{title}</p>
          <div className="flex items-center gap-1">
            <a
              href={downloadHref}
              download={title}
              className="flex size-10 items-center justify-center rounded-full bg-white/10"
              aria-label="تحميل"
            >
              <Download className="size-4" />
            </a>
            <button type="button" className="flex size-10 items-center justify-center rounded-full bg-white/10" onClick={onClose}>
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className={cn("relative flex min-h-0 flex-1 items-center justify-center", showNav && "px-10")}>
          {showNav ? (
            <button
              type="button"
              className="absolute right-0 flex size-10 items-center justify-center rounded-full bg-white/15"
              onClick={onPrev}
              aria-label="السابق"
            >
              <ChevronRight className="size-5" />
            </button>
          ) : null}
          {children}
          {showNav ? (
            <button
              type="button"
              className="absolute left-0 flex size-10 items-center justify-center rounded-full bg-white/15"
              onClick={onNext}
              aria-label="التالي"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

