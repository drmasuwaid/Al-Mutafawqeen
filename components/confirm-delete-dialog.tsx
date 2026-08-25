"use client";

import { Loader2, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "حذف",
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <button
          type="button"
          className="absolute top-4 left-4 flex size-10 items-center justify-center text-slate-400 hover:text-slate-600"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3 pt-1">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Trash2 className="size-5" />
          </span>
          <div>
            <DialogTitle className="text-xl font-extrabold">{title}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500">{description}</DialogDescription>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-red-500 font-bold text-white hover:bg-red-600 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : confirmLabel}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 rounded-xl bg-slate-100 px-5 font-semibold text-slate-600"
          >
            إلغاء
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
