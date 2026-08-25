"use client";

import { toast } from "sonner";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";
import { dueBucket, formatDue, isFresh } from "@/lib/dates";
import type { DueBucket, Homework, Profile, SchoolClass, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

const BUCKETS: DueBucket[] = ["overdue", "today", "soon", "upcoming"];

export function HomeworkBoard({
  profile,
  homework,
  classes,
  subjects,
  filter,
  onFilter,
}: {
  profile: Profile;
  homework: Homework[];
  classes: SchoolClass[];
  subjects: Subject[];
  filter: DueBucket | "all";
  onFilter: (value: DueBucket | "all") => void;
}) {
  const { t } = useLocale();
  const visible =
    filter === "all" ? homework : homework.filter((item) => dueBucket(item.dueAt) === filter);

  async function toggleDone(item: Homework, done: boolean) {
    const res = await fetch("/api/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeworkId: item.id, done }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error || t.loadError);
    }
  }

  async function remove(item: Homework) {
    const res = await fetch(`/api/homework/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error || t.loadError);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => onFilter("all")}>
          {t.all}
        </FilterChip>
        {BUCKETS.map((bucket) => (
          <FilterChip
            key={bucket}
            active={filter === bucket}
            onClick={() => onFilter(bucket)}
            tone={bucket}
          >
            {t[bucket]}
          </FilterChip>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-teal-900/15 bg-white/70 px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-teal-950">{t.emptyTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.emptyBody}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.map((item) => (
            <HomeworkCard
              key={item.id}
              item={item}
              profile={profile}
              subject={subjects.find((row) => row.id === item.subjectId)}
              classItem={classes.find((row) => row.id === item.classId)}
              onToggle={toggleDone}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HomeworkCard({
  item,
  profile,
  subject,
  classItem,
  onToggle,
  onDelete,
}: {
  item: Homework;
  profile: Profile;
  subject?: Subject;
  classItem?: SchoolClass;
  onToggle: (item: Homework, done: boolean) => Promise<void>;
  onDelete: (item: Homework) => Promise<void>;
}) {
  const { t, locale } = useLocale();
  const bucket = dueBucket(item.dueAt);
  const mine = item.completions.find((row) => row.studentId === profile.uid);
  const done = mine?.status === "done";
  const classSizeHint = item.completions.filter((row) => row.status === "done").length;
  const canDelete = profile.role === "admin" || profile.uid === item.teacherId;
  const title = locale === "ar" ? item.titleAr : item.title;
  const details = locale === "ar" ? item.detailsAr : item.details;
  const teacher = locale === "ar" ? item.teacherNameAr : item.teacherName;

  return (
    <Card className={cn("overflow-hidden py-0 ring-teal-900/8", isFresh(item.createdAt) && "ring-2 ring-teal-700")}>
      <div className="flex">
        <div className="w-1.5 shrink-0" style={{ background: subject?.color ?? "#0f766e" }} />
        <div className="min-w-0 flex-1">
          <CardHeader className="gap-2 pt-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{locale === "ar" ? subject?.nameAr : subject?.name}</Badge>
                  <Badge variant="outline">{locale === "ar" ? classItem?.nameAr : classItem?.name}</Badge>
                  <DueBadge bucket={bucket} label={t[bucket]} />
                  {isFresh(item.createdAt) ? (
                    <Badge className="bg-teal-700 text-white">{t.justNow}</Badge>
                  ) : null}
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
              {canDelete ? (
                <Button variant="ghost" size="icon-sm" onClick={() => void onDelete(item)} aria-label={t.delete}>
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {details ? <p className="text-sm leading-6 text-muted-foreground">{details}</p> : null}
            <p className="text-sm text-teal-950">
              <span className="text-muted-foreground">{t.due}: </span>
              {formatDue(item.dueAt, locale)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.assignedBy} {teacher}
              {profile.role !== "student"
                ? ` · ${classSizeHint} ${t.completedOf}`
                : null}
            </p>
          </CardContent>
          {profile.role === "student" ? (
            <CardFooter className="pb-4">
              <Button
                variant={done ? "outline" : "default"}
                className={done ? "" : "bg-teal-800 text-white hover:bg-teal-800/90"}
                onClick={() => void onToggle(item, !done)}
              >
                {done ? <CheckCircle2 /> : <Circle />}
                {done ? t.markNotDone : t.markDone}
              </Button>
            </CardFooter>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function DueBadge({ bucket, label }: { bucket: DueBucket; label: string }) {
  const className =
    bucket === "overdue"
      ? "bg-red-600/10 text-red-800 border-red-600/15"
      : bucket === "today"
        ? "bg-amber-500/15 text-amber-900 border-amber-500/20"
        : bucket === "soon"
          ? "bg-sky-600/10 text-sky-900 border-sky-600/15"
          : "bg-teal-700/10 text-teal-900 border-teal-700/15";
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: DueBucket;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-teal-800 bg-teal-800 text-white"
          : "border-teal-900/10 bg-white text-teal-950 hover:bg-teal-50",
        !active && tone === "overdue" && "text-red-800",
        !active && tone === "today" && "text-amber-800"
      )}
    >
      {children}
    </button>
  );
}
