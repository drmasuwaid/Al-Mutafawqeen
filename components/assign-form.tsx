"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/hooks/use-locale";
import type { Profile, SchoolClass, Subject } from "@/lib/types";

export function AssignForm({
  profile,
  classes,
  subjects,
  onPublished,
}: {
  profile: Profile;
  classes: SchoolClass[];
  subjects: Subject[];
  onPublished?: () => void;
}) {
  const { t, locale } = useLocale();
  const allowedClasses =
    profile.role === "admin"
      ? classes
      : classes.filter((item) => profile.classIds?.includes(item.id));
  const allowedSubjects =
    profile.role === "admin"
      ? subjects
      : subjects.filter((item) => profile.subjectIds?.includes(item.id));

  const defaultDue = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(16, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }, []);

  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [details, setDetails] = useState("");
  const [detailsAr, setDetailsAr] = useState("");
  const [classId, setClassId] = useState(allowedClasses[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(allowedSubjects[0]?.id ?? "");
  const [dueAt, setDueAt] = useState(defaultDue);
  const [busy, setBusy] = useState(false);

  async function publish() {
    if (!title.trim() || !titleAr.trim() || !classId || !subjectId || !dueAt) {
      toast.error(t.required);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          titleAr,
          details,
          detailsAr,
          classId,
          subjectId,
          dueAt,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success(t.published);
      setTitle("");
      setTitleAr("");
      setDetails("");
      setDetailsAr("");
      onPublished?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadError);
    } finally {
      setBusy(false);
    }
  }

  const label = (item: { name: string; nameAr: string }) =>
    locale === "ar" ? item.nameAr : item.name;

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void publish();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.titleAr}>
          <Input value={titleAr} onChange={(event) => setTitleAr(event.target.value)} dir="rtl" />
        </Field>
        <Field label={t.titleEn}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} dir="ltr" />
        </Field>
        <Field label={t.classLabel}>
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
          >
            {allowedClasses.map((item) => (
              <option key={item.id} value={item.id}>
                {label(item)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.subject}>
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            {allowedSubjects.map((item) => (
              <option key={item.id} value={item.id}>
                {label(item)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t.dueAt}>
        <Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
      </Field>
      <Field label={t.detailsAr}>
        <Textarea value={detailsAr} onChange={(event) => setDetailsAr(event.target.value)} dir="rtl" />
      </Field>
      <Field label={t.detailsEn}>
        <Textarea value={details} onChange={(event) => setDetails(event.target.value)} dir="ltr" />
      </Field>
      <Button type="submit" className="bg-teal-800 text-white hover:bg-teal-800/90" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        {busy ? t.publishing : t.publish}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
