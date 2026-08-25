export const SECTIONS = [
  { id: "a", ar: "أ", en: "A" },
  { id: "b", ar: "ب", en: "B" },
  { id: "c", ar: "ج", en: "C" },
  { id: "d", ar: "د", en: "D" },
  { id: "e", ar: "هـ", en: "E" },
  { id: "f", ar: "و", en: "F" },
] as const;

export const GRADES = [
  { id: "m1", nameAr: "الأول متوسط", name: "First Intermediate", grade: 1 },
  { id: "m2", nameAr: "الثاني متوسط", name: "Second Intermediate", grade: 2 },
  { id: "m3", nameAr: "الثالث متوسط", name: "Third Intermediate", grade: 3 },
  { id: "s4", nameAr: "الرابع علمي", name: "Fourth Scientific", grade: 4 },
  { id: "s5", nameAr: "الخامس علمي", name: "Fifth Scientific", grade: 5 },
  { id: "s6", nameAr: "السادس علمي", name: "Sixth Scientific", grade: 6 },
] as const;

export type GradeId = (typeof GRADES)[number]["id"];
export type SectionId = (typeof SECTIONS)[number]["id"];

export function classIdFor(gradeId: string, sectionId: string) {
  return `${gradeId}-${sectionId}`;
}

export function parseClassId(classId: string) {
  const [gradeId, sectionId] = classId.split("-");
  const grade = GRADES.find((item) => item.id === gradeId);
  const section = SECTIONS.find((item) => item.id === sectionId);
  return { gradeId, sectionId, grade, section };
}

export function allClasses() {
  return GRADES.flatMap((grade) =>
    SECTIONS.map((section) => ({
      id: classIdFor(grade.id, section.id),
      gradeId: grade.id,
      sectionId: section.id,
      grade: grade.grade,
      name: `${grade.name} ${section.en}`,
      nameAr: `${grade.nameAr} · شعبة ${section.ar}`,
      section: section.en,
      gradeLabelAr: grade.nameAr,
      sectionLabelAr: `شعبة ${section.ar}`,
    }))
  );
}

export function classById(classId: string) {
  return allClasses().find((item) => item.id === classId) ?? null;
}
