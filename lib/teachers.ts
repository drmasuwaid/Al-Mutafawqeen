import type { Profile, SubjectGrade } from "@/lib/types";
import { classIdFor } from "@/lib/catalog";

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

export function isHomeworkOwner(
  user: Profile,
  item: { createdBy?: string; teacherId?: string }
) {
  const owner = item.createdBy || item.teacherId;
  if (!owner) return false;
  if (user.role === "admin") return true;
  return user.uid === owner;
}

export function newAssignmentId() {
  return `sg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
