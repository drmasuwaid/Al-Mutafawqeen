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

export type NamedSelection = { id: string; nameAr: string };

export type GradeAssignmentGroup = {
  gradeId: string;
  gradeNameAr: string;
  sectionIds: string[];
  sectionLabelsAr: string[];
  subjectIds: string[];
  subjects: NamedSelection[];
  subjectNamesAr: string[];
  rows: SubjectGrade[];
  line: string;
};

function uniqueIds(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))];
}

export function formatGradeAssignmentLine(
  gradeNameAr: string,
  sectionLabelsAr: string[],
  subjectNamesAr: string[]
) {
  const parts = [gradeNameAr, ...sectionLabelsAr.filter(Boolean)];
  const subjects = formatGroupedSubjects(subjectNamesAr);
  if (subjects) parts.push(subjects);
  return parts.join(" - ");
}

export function groupAssignmentsByGrade(rows: SubjectGrade[] | undefined): GradeAssignmentGroup[] {
  const byGrade = new Map<string, SubjectGrade[]>();
  for (const row of rows ?? []) {
    if (!row.gradeId) continue;
    if (!byGrade.has(row.gradeId)) byGrade.set(row.gradeId, []);
    byGrade.get(row.gradeId)!.push(row);
  }

  const extraIds = [...byGrade.keys()].filter((id) => !GRADES.some((grade) => grade.id === id));
  const orderedIds = [...GRADES.map((grade) => grade.id), ...extraIds].filter((id) => byGrade.has(id));

  return orderedIds.map((gradeId) => {
    const groupRows = byGrade.get(gradeId) ?? [];
    const grade = GRADES.find((item) => item.id === gradeId);
    const gradeNameAr = grade?.nameAr ?? gradeId;
    const sectionIds = SECTIONS.map((section) => section.id).filter((id) =>
      groupRows.some((row) => row.sectionId === id)
    );
    const extraSections = [...new Set(groupRows.map((row) => row.sectionId))].filter(
      (id) => id && !sectionIds.includes(id as (typeof SECTIONS)[number]["id"])
    );
    const allSectionIds = [...sectionIds, ...extraSections];
    const sectionLabelsAr = allSectionIds.map((id) => {
      const section = SECTIONS.find((item) => item.id === id);
      return section ? `شعبة ${section.ar}` : id;
    });
    const subjects: NamedSelection[] = [];
    const seen = new Set<string>();
    for (const row of groupRows) {
      if (!row.subjectId || seen.has(row.subjectId)) continue;
      seen.add(row.subjectId);
      subjects.push({ id: row.subjectId, nameAr: row.subjectNameAr });
    }
    const subjectNamesAr = subjects.map((item) => item.nameAr).filter(Boolean);
    return {
      gradeId,
      gradeNameAr,
      sectionIds: allSectionIds,
      sectionLabelsAr,
      subjectIds: subjects.map((item) => item.id),
      subjects,
      subjectNamesAr,
      rows: groupRows,
      line: formatGradeAssignmentLine(gradeNameAr, sectionLabelsAr, subjectNamesAr),
    };
  });
}

export function teacherMatchesStaffFilters(
  teacher: { subjectsGrades?: SubjectGrade[] },
  filters: { gradeId?: string; subjectId?: string }
) {
  const gradeId = filters.gradeId?.trim() ?? "";
  const subjectId = filters.subjectId?.trim() ?? "";
  if (!gradeId && !subjectId) return true;
  const rows = teacher.subjectsGrades ?? [];
  return rows.some((row) => {
    if (gradeId && row.gradeId !== gradeId) return false;
    if (subjectId && row.subjectId !== subjectId) return false;
    return true;
  });
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
  const subjectIds = subjects.map((subject) => subject.id);
  return assignmentsFromGradeSections(
    gradeIds.map((gradeId) => ({ gradeId, sectionIds, subjectIds })),
    subjects
  );
}

export type GradeSectionSelection = {
  gradeId: string;
  sectionIds: string[];
  subjectIds: string[];
};

export function assignmentsFromGradeSections(
  grades: GradeSectionSelection[],
  subjects: { id: string; nameAr: string }[]
): SubjectGrade[] {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const rows: SubjectGrade[] = [];
  const seen = new Set<string>();
  for (const grade of grades) {
    const gradeId = grade.gradeId.trim();
    if (!gradeId) continue;
    const sectionIds = uniqueIds(grade.sectionIds);
    const subjectIds = uniqueIds(grade.subjectIds);
    for (const sectionId of sectionIds) {
      for (const subjectId of subjectIds) {
        const subject = subjectMap.get(subjectId);
        if (!subject) continue;
        const id = `${gradeId}-${sectionId}-${subject.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        rows.push({
          id,
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

export function teacherCanPublishAssignment(
  user: { role?: string; subjectsGrades?: SubjectGrade[] } | null | undefined,
  classIds: string[],
  subjectId: string
) {
  if (!user || user.role === "admin") return true;
  const rows = user.subjectsGrades ?? [];
  if (!rows.length) return true;
  const wantedSubject = String(subjectId ?? "").trim();
  if (!wantedSubject) return false;
  return classIds.every((classId) => {
    const [gradeId, sectionId] = classId.split("-");
    return rows.some(
      (row) =>
        row.gradeId === gradeId &&
        row.sectionId === sectionId &&
        row.subjectId === wantedSubject
    );
  });
}

export function pickerSelectionsFromAssignments(rows: SubjectGrade[] | undefined): {
  grades: NamedSelection[];
  sections: NamedSelection[];
  subjects: NamedSelection[];
} {
  const grouped = pickerGradeSectionsFromAssignments(rows);
  const sectionIds = new Set(grouped.grades.flatMap((grade) => grade.sections.map((section) => section.id)));
  return {
    grades: grouped.grades.map((grade) => ({ id: grade.id, nameAr: grade.nameAr })),
    sections: SECTIONS.filter((section) => sectionIds.has(section.id)).map((section) => ({
      id: section.id,
      nameAr: `شعبة ${section.ar}`,
    })),
    subjects: grouped.subjects,
  };
}

export type GradeSectionPicker = NamedSelection & {
  sections: NamedSelection[];
  subjects: NamedSelection[];
};

export function pickerGradeSectionsFromAssignments(
  rows: SubjectGrade[] | undefined
): {
  grades: GradeSectionPicker[];
  subjects: NamedSelection[];
} {
  const groups = groupAssignmentsByGrade(rows);
  const subjects: NamedSelection[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const subject of group.subjects) {
      if (seen.has(subject.id)) continue;
      seen.add(subject.id);
      subjects.push(subject);
    }
  }
  return {
    grades: groups.map((group) => ({
      id: group.gradeId,
      nameAr: group.gradeNameAr,
      sections: group.sectionIds.map((id, index) => ({
        id,
        nameAr: group.sectionLabelsAr[index] ?? id,
      })),
      subjects: group.subjects.map((subject) => ({ ...subject })),
    })),
    subjects,
  };
}
