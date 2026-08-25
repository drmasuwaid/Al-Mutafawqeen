"use client";

import { Calendar, Pencil, Trash2 } from "lucide-react";
import { AttachmentGallery } from "@/components/attachment-gallery";
import { classById } from "@/lib/catalog";
import { formatDueDay, isFresh } from "@/lib/dates";
import type { Homework, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HomeworkItem({
  item,
  subject,
  canManage,
  onEdit,
  onDelete,
}: {
  item: Homework;
  subject?: Subject;
  canManage?: boolean;
  onEdit?: (item: Homework) => void;
  onDelete?: (item: Homework) => void;
}) {
  const classTags = item.classIds.length ? item.classIds : [item.classId];

  return (
    <article className="soft-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {subject?.nameAr ?? "مادة"}
          </span>
          {classTags.map((id) => {
            const cls = classById(id);
            return (
              <span
                key={id}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                {cls ? `${cls.gradeLabelAr} · ${cls.sectionLabelAr}` : id}
              </span>
            );
          })}
          {isFresh(item.createdAt) ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              جديد الآن
            </span>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex items-center gap-1">
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="flex size-10 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50"
                aria-label="تعديل"
              >
                <Pencil className="size-4" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="flex size-10 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                aria-label="حذف"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <h3 className="mt-3 text-base font-extrabold text-slate-900">{item.titleAr || item.title}</h3>
      {item.teacherNameAr ? (
        <p className="mt-1 text-xs text-slate-400">نشر بواسطة: {item.teacherNameAr}</p>
      ) : null}
      {item.detailsAr || item.details ? (
        <p className="mt-2 text-sm leading-7 text-slate-500">{item.detailsAr || item.details}</p>
      ) : null}

      {item.dueAt ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-amber-700">
          <Calendar className="size-4 text-amber-500" />
          موعد التسليم: {formatDueDay(item.dueAt)}
        </p>
      ) : null}

      <AttachmentGallery attachments={item.attachments} />
    </article>
  );
}

export function EmptyHomework({
  title = "لا توجد واجبات منشورة حالياً",
  body = "لم يقم المدرس بنشر واجبات جديدة لهذا الصف والشعبة بعد.",
  className,
}: {
  title?: string;
  body?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center",
        className
      )}
    >
      <span className="flex size-20 items-center justify-center rounded-full bg-slate-100 text-slate-300">
        <svg viewBox="0 0 24 24" className="size-10 fill-current">
          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
      </span>
      <h2 className="mt-5 text-lg font-extrabold text-slate-700">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">{body}</p>
    </div>
  );
}
