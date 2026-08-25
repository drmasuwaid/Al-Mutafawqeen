import type { Profile, SubjectGrade } from "@/lib/types";
import { classIdFor, GRADES, SECTIONS } from "@/lib/catalog";

export const TEACHER_ID_KEY = "stf_teacher_id";

export function persistTeacherId(teacherId: string | undefined) {
  if (typeof window === "undefined" || !teacherId) return;
  window.localStorage.setItem(TEACHER_ID_KEY, teacherId);
  window.sessionStorage.setItem(TEACHER_ID_KEY, teacherId);
}

export function clearTeacherId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TEACHER_ID_KEY);
  window.sessionStorage.removeItem(TEACHER_ID_KEY);
}

export function readStoredTeacherId() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TEACHER_ID_KEY) || window.localStorage.getItem(TEACHER_ID_KEY);
}

export function classIdsFromAssignments(rows: SubjectGrade[] | undefined) {
  return [...new Set((rows ?? []).map((row) => classIdFor(row.gradeId, row.sectionId)))];
}

export function subjectIdsFromAssignments(rows: SubjectGrade[] | undefined) {
  return [...new Set((rows ?? []).map((row) => row.subjectId))];
}

export function teacherClassIds(user: Profile) {
  if (user.subjectsGrades?.length) return classIdsFromAssignments(user.subjectsGrades);
  return user.classIds ?? [];
}

export function sessionTeacherId(user: { uid: string; teacherId?: string } | null | undefined) {
  if (!user) return "";
  return (user.teacherId || user.uid || "").trim();
}

export function isHomeworkOwner(
  user: { uid: string; teacherId?: string } | null | undefined,
  item: { createdBy?: string; teacherId?: string } | null | undefined
) {
  const currentId = sessionTeacherId(user);
  const createdBy = String(item?.createdBy ?? "").trim();
  if (!currentId || !createdBy) return false;
  return createdBy === currentId;
}

export function newAssignmentId() {
  return `sg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type AssignmentGroup = {
  key: string;
  gradeId: string;
  sectionId: string;
  rows: SubjectGrade[];
  subjectNamesAr: string[];
};

export function groupAssignments(rows: SubjectGrade[] | undefined): AssignmentGroup[] {
  const map = new Map<string, SubjectGrade[]>();
  const order: string[] = [];
  for (const row of rows ?? []) {
    const key = classIdFor(row.gradeId, row.sectionId);
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(row);
  }
  return order.map((key) => {
    const groupRows = map.get(key) ?? [];
    const names: string[] = [];
    const seen = new Set<string>();
    for (const row of groupRows) {
      if (seen.has(row.subjectId)) continue;
      seen.add(row.subjectId);
      names.push(row.subjectNameAr);
    }
    return {
      key,
      gradeId: groupRows[0]?.gradeId ?? "",
      sectionId: groupRows[0]?.sectionId ?? "",
      rows: groupRows,
      subjectNamesAr: names,
    };
  });
}

export function formatGroupedSubjects(names: string[]) {
  return names.filter(Boolean).join("، ");
}

export function compareArabicNames(a: string, b: string) {
  return a.localeCompare(b, "ar", { sensitivity: "base", numeric: true });
}

export function isPrincipal(user: { role?: string } | null | undefined) {
  return user?.role === "admin";
}

export function assignmentsFromSelections(
  gradeIds: string[],
  sectionIds: string[],
  subjects: { id: string; nameAr: string }[]
): SubjectGrade[] {
  const rows: SubjectGrade[] = [];
  for (const gradeId of gradeIds) {
    for (const sectionId of sectionIds) {
      for (const subject of subjects) {
        rows.push({
          id: `${gradeId}-${sectionId}-${subject.id}`,
          gradeId,
          sectionId,
          subjectId: subject.id,
          subjectNameAr: subject.nameAr,
        });
      }
    }
  }
  return rows;
}

export type NamedSelection = { id: string; nameAr: string };

export function pickerSelectionsFromAssignments(rows: SubjectGrade[] | undefined): {
  grades: NamedSelection[];
  sections: NamedSelection[];
  subjects: NamedSelection[];
} {
  const list = rows ?? [];
  const gradeIds = new Set(list.map((row) => row.gradeId));
  const sectionIds = new Set(list.map((row) => row.sectionId));
  const subjects: NamedSelection[] = [];
  const seen = new Set<string>();
  for (const row of list) {
    if (seen.has(row.subjectId)) continue;
    seen.add(row.subjectId);
    subjects.push({ id: row.subjectId, nameAr: row.subjectNameAr });
  }
  return {
    grades: GRADES.filter((grade) => gradeIds.has(grade.id)).map((grade) => ({
      id: grade.id,
      nameAr: grade.nameAr,
    })),
    sections: SECTIONS.filter((section) => sectionIds.has(section.id)).map((section) => ({
      id: section.id,
      nameAr: `شعبة ${section.ar}`,
    })),
    subjects,
  };
}
