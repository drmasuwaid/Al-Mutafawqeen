export type TeacherGender = "female" | "male";

const HONORIFICS = new Set([
  "ا",
  "أ",
  "الاستاذ",
  "الأستاذ",
  "الاستاذه",
  "الأستاذه",
  "الاستاذة",
  "الأستاذة",
  "استاذ",
  "أستاذ",
  "استاذه",
  "أستاذة",
  "مدرس",
  "مدرسة",
  "المدرس",
  "المدرسة",
]);

const FEMALE_GIVEN = new Set([
  "سماره",
  "مريم",
  "ساره",
  "فاطمه",
  "عايشه",
  "زينب",
  "خديجه",
  "ليلى",
  "ليلا",
  "ليلي",
  "نور",
  "نورا",
  "نوره",
  "هدى",
  "هدي",
  "هناء",
  "اسماء",
  "امل",
  "اماني",
  "رنا",
  "رند",
  "لينا",
  "دينا",
  "دانا",
  "منى",
  "مني",
  "منال",
  "هبه",
  "ايمان",
  "سلمي",
  "نجوى",
  "نجوي",
  "رقيه",
  "اسراء",
  "بتول",
  "حوراء",
  "يسرى",
  "غاده",
  "عبير",
  "لمى",
  "لمي",
  "رؤى",
  "روي",
  "شيماء",
  "دعاء",
  "رجاء",
  "وفاء",
  "علا",
  "نرمين",
  "نسرين",
  "ياسمين",
  "هند",
  "حنان",
  "سوزان",
  "سهى",
  "سهي",
  "رباب",
  "ازهار",
  "ملاك",
  "جمانه",
  "سعاد",
  "سميره",
  "ناديه",
  "فدوى",
  "فدوي",
  "صفاء",
  "سناء",
  "اسيل",
  "تبارك",
  "زهراء",
]);

const MALE_GIVEN = new Set([
  "احمد",
  "محمد",
  "محمود",
  "علي",
  "حسن",
  "حسين",
  "عمر",
  "عثمان",
  "يوسف",
  "مصطفى",
  "خالد",
  "سامر",
  "سامي",
  "كريم",
  "امير",
  "زيد",
  "ياسر",
  "وليد",
  "طارق",
  "فهد",
  "ناصر",
  "سعيد",
  "ماجد",
  "بدر",
  "رائد",
  "ضياء",
  "علاء",
  "بهاء",
  "حسام",
  "اياد",
  "ليث",
  "رعد",
  "قاسم",
  "جاسم",
  "عباس",
  "جعفر",
  "صالح",
  "عادل",
  "فواد",
  "نبيل",
  "حكيم",
  "حمزة",
  "حمزه",
  "اسامه",
  "معاويه",
  "عبيده",
  "طلحه",
  "عتبه",
  "يحيى",
  "يحيي",
  "موسى",
  "موسي",
  "عيسى",
  "عيسي",
  "مرتضى",
  "مرتضي",
  "يسري",
]);

function stripMarks(input: string) {
  return input
    .normalize("NFKC")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function foldGiven(name: string) {
  return stripMarks(name).replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
}

export function teacherGivenName(displayNameAr: string) {
  const tokens = displayNameAr
    .replace(/[.,،:_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length > 1 && HONORIFICS.has(tokens[0].replace(/\./g, ""))) {
    tokens.shift();
  }
  return tokens[0] ?? displayNameAr.trim();
}

export function inferTeacherGender(
  displayNameAr: string | null | undefined,
  metadataGender?: string | null
): TeacherGender {
  const explicit = String(metadataGender ?? "").trim().toLowerCase();
  if (explicit === "female" || explicit === "f" || explicit === "انثى" || explicit === "أنثى") {
    return "female";
  }
  if (explicit === "male" || explicit === "m" || explicit === "ذكر") {
    return "male";
  }

  const given = teacherGivenName(displayNameAr ?? "");
  if (!given) return "male";
  const folded = foldGiven(given);
  if (MALE_GIVEN.has(folded)) return "male";
  if (FEMALE_GIVEN.has(folded)) return "female";

  const marked = stripMarks(given);
  if (/ة$/.test(marked) && !MALE_GIVEN.has(folded)) return "female";
  if (/ى$/.test(marked) && !MALE_GIVEN.has(folded)) return "female";
  if (/اء$/.test(marked) && !MALE_GIVEN.has(folded)) return "female";
  return "male";
}

export function isFemaleTeacherName(displayNameAr: string | null | undefined, metadataGender?: string | null) {
  return inferTeacherGender(displayNameAr, metadataGender) === "female";
}

export function teacherGreetingAr(displayNameAr: string | null | undefined, metadataGender?: string | null) {
  return isFemaleTeacherName(displayNameAr, metadataGender) ? "أهلاً بكِ، أستاذة" : "أهلاً بك، أستاذ";
}

export function teacherAvatarSrc(displayNameAr: string | null | undefined, metadataGender?: string | null) {
  return isFemaleTeacherName(displayNameAr, metadataGender)
    ? "/teacher-avatar-female.png"
    : "/teacher-avatar.png";
}
