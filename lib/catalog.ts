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

export function groupedClassBadgeLabels(classIds: string[]) {
  const groups = new Map<
    string,
    { key: string; gradeLabel: string; gradeOrder: number; sections: { id: string; label: string; order: number }[] }
  >();
  const leftovers: string[] = [];

  for (const id of classIds) {
    const cls = classById(id);
    if (!cls) {
      leftovers.push(id);
      continue;
    }
    let group = groups.get(cls.gradeId);
    if (!group) {
      group = {
        key: cls.gradeId,
        gradeLabel: cls.gradeLabelAr,
        gradeOrder: cls.grade,
        sections: [],
      };
      groups.set(cls.gradeId, group);
    }
    if (!group.sections.some((section) => section.id === cls.sectionId)) {
      const order = SECTIONS.findIndex((section) => section.id === cls.sectionId);
      group.sections.push({
        id: cls.sectionId,
        label: cls.sectionLabelAr,
        order: order < 0 ? 99 : order,
      });
    }
  }

  const badges = [...groups.values()]
    .sort((a, b) => a.gradeOrder - b.gradeOrder)
    .map((group) => {
      const sections = group.sections
        .sort((a, b) => a.order - b.order)
        .map((section) => section.label)
        .join("، ");
      return { key: group.key, text: `${group.gradeLabel} - ${sections}` };
    });

  for (const id of leftovers) {
    badges.push({ key: id, text: id });
  }
  return badges;
}
