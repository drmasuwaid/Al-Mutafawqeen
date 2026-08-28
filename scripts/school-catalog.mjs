export const SECTIONS = [
  { id: "a", ar: "أ", en: "A" },
  { id: "b", ar: "ب", en: "B" },
  { id: "c", ar: "ج", en: "C" },
  { id: "d", ar: "د", en: "D" },
  { id: "e", ar: "هـ", en: "E" },
  { id: "f", ar: "و", en: "F" },
];

export const GRADES = [
  { id: "m1", nameAr: "الأول متوسط", name: "First Intermediate", grade: 1 },
  { id: "m2", nameAr: "الثاني متوسط", name: "Second Intermediate", grade: 2 },
  { id: "m3", nameAr: "الثالث متوسط", name: "Third Intermediate", grade: 3 },
  { id: "s4", nameAr: "الرابع علمي", name: "Fourth Scientific", grade: 4 },
  { id: "s5", nameAr: "الخامس علمي", name: "Fifth Scientific", grade: 5 },
  { id: "s6", nameAr: "السادس علمي", name: "Sixth Scientific", grade: 6 },
];

export const classes = GRADES.flatMap((grade) =>
  SECTIONS.map((section) => ({
    id: `${grade.id}-${section.id}`,
    name: `${grade.name} ${section.en}`,
    nameAr: `${grade.nameAr} · شعبة ${section.ar}`,
    grade: grade.grade,
    section: section.en,
  }))
);

export const subjects = [
  { id: "arabic", name: "Arabic", nameAr: "اللغة العربية", color: "#2563eb" },
  { id: "english", name: "English", nameAr: "اللغة الإنكليزية", color: "#1d4ed8" },
  { id: "french", name: "French", nameAr: "اللغة الفرنسية", color: "#7c3aed" },
  { id: "math", name: "Mathematics", nameAr: "الرياضيات", color: "#2563eb" },
  { id: "physics", name: "Physics", nameAr: "الفيزياء", color: "#64748b" },
  { id: "chemistry", name: "Chemistry", nameAr: "الكيمياء", color: "#be123c" },
  { id: "biology", name: "Biology", nameAr: "علم الأحياء", color: "#15803d" },
  { id: "islamic", name: "Islamic Education", nameAr: "التربية الإسلامية", color: "#365314" },
  { id: "computer", name: "Computer", nameAr: "الحاسوب", color: "#334155" },
];
