import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8181";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "school-task-flow";
const PASSWORD = "LiveSync2026";

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

const SECTIONS = [
  { id: "a", ar: "أ", en: "A" },
  { id: "b", ar: "ب", en: "B" },
  { id: "c", ar: "ج", en: "C" },
  { id: "d", ar: "د", en: "D" },
  { id: "e", ar: "هـ", en: "E" },
  { id: "f", ar: "و", en: "F" },
];

const GRADES = [
  { id: "m1", nameAr: "الأول متوسط", name: "First Intermediate", grade: 1 },
  { id: "m2", nameAr: "الثاني متوسط", name: "Second Intermediate", grade: 2 },
  { id: "m3", nameAr: "الثالث متوسط", name: "Third Intermediate", grade: 3 },
  { id: "s4", nameAr: "الرابع علمي", name: "Fourth Scientific", grade: 4 },
  { id: "s5", nameAr: "الخامس علمي", name: "Fifth Scientific", grade: 5 },
  { id: "s6", nameAr: "السادس علمي", name: "Sixth Scientific", grade: 6 },
];

const classes = GRADES.flatMap((grade) =>
  SECTIONS.map((section) => ({
    id: `${grade.id}-${section.id}`,
    name: `${grade.name} ${section.en}`,
    nameAr: `${grade.nameAr} · شعبة ${section.ar}`,
    grade: grade.grade,
    section: section.en,
  }))
);

const subjects = [
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

const users = [
  {
    uid: "admin-noura",
    email: "noura.admin@mutafawqeen.school",
    username: "noura",
    displayName: "Noura Abdelqader",
    displayNameAr: "نورة عبد القادر",
    role: "admin",
    classIds: classes.map((item) => item.id),
    subjectIds: subjects.map((item) => item.id),
  },
  {
    uid: "teacher-ahmed",
    email: "ahmed@mutafawqeen.school",
    username: "ahmed",
    displayName: "Ahmed Al-Iraqi",
    displayNameAr: "أ. أحمد العراقي",
    role: "teacher",
    classIds: ["m2-a", "m2-b", "s4-a", "s4-b"],
    subjectIds: ["math", "physics"],
  },
  {
    uid: "teacher-layla",
    email: "layla.arabic@mutafawqeen.school",
    username: "layla",
    displayName: "Layla Al-Khazraji",
    displayNameAr: "ليلى الخزرجي",
    role: "teacher",
    classIds: ["s4-a", "s4-b", "s5-a"],
    subjectIds: ["arabic"],
  },
  {
    uid: "teacher-omar",
    email: "omar.math@mutafawqeen.school",
    username: "omar",
    displayName: "Omar Al-Jubouri",
    displayNameAr: "عمر الجبوري",
    role: "teacher",
    classIds: ["s5-a", "s6-a"],
    subjectIds: ["math"],
  },
];

function daysFromNow(days, hour = 16) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function upsertUser(user) {
  try {
    await auth.deleteUser(user.uid);
  } catch {
    /* first run */
  }
  await auth.createUser({
    uid: user.uid,
    email: user.email,
    password: PASSWORD,
    displayName: user.displayName,
    emailVerified: true,
  });
  const { uid, ...profile } = user;
  await db.doc(`users/${uid}`).set(profile);
}

async function wipeCollection(name) {
  const existing = await db.collection(name).get();
  for (const doc of existing.docs) {
    const sub = await doc.ref.collection("completions").get();
    const batch = db.batch();
    sub.docs.forEach((row) => batch.delete(row.ref));
    batch.delete(doc.ref);
    await batch.commit();
  }
}

async function main() {
  await wipeCollection("classes");
  await wipeCollection("subjects");
  await wipeCollection("homework");

  for (const item of classes) {
    const { id, ...data } = item;
    await db.doc(`classes/${id}`).set(data);
  }
  for (const item of subjects) {
    const { id, ...data } = item;
    await db.doc(`subjects/${id}`).set(data);
  }
  for (const user of users) {
    await upsertUser(user);
  }

  const homework = [
    {
      title: "Linear equations in two variables",
      titleAr: "حل تمارين المعادلات الخطية في متغيرين",
      details:
        "Complete exercises 1–12. Show every step and bring the notebook tomorrow.",
      detailsAr:
        "حل التمارين من 1 إلى 12 في كتاب الرياضيات مع إظهار خطوات الحل كاملة، وتسليم الدفتر غداً.",
      subjectId: "math",
      classId: "m2-a",
      classIds: ["m2-a"],
      teacherId: "teacher-ahmed",
      teacherName: "Ahmed Al-Iraqi",
      teacherNameAr: "أ. أحمد العراقي",
      dueAt: daysFromNow(3, 16),
      status: "published",
      attachments: [],
    },
    {
      title: "Newton’s laws worksheet",
      titleAr: "ورقة عمل قوانين نيوتن للحركة",
      details: "Read pages 44–47 and answer the questions at the end of the lesson.",
      detailsAr:
        "اقرأ الصفحات 44 إلى 47 من كتاب الفيزياء وأجب عن الأسئلة في نهاية الدرس.",
      subjectId: "physics",
      classId: "m2-a",
      classIds: ["m2-a"],
      teacherId: "teacher-ahmed",
      teacherName: "Ahmed Al-Iraqi",
      teacherNameAr: "أ. أحمد العراقي",
      dueAt: daysFromNow(5, 16),
      status: "published",
      attachments: [{ name: "قوانين-نيوتن.pdf", type: "application/pdf", size: 240000 }],
    },
    {
      title: "Al-Mutanabbi summary",
      titleAr: "تلخيص قصيدة المتنبي",
      details: "Write a one-page summary and list three rhetorical devices.",
      detailsAr:
        "اكتب تلخيصاً بصفحة واحدة للقصيدة التي نوقشت في الصف، واذكر ثلاثة من المحسنات البديعية.",
      subjectId: "arabic",
      classId: "s4-a",
      classIds: ["s4-a"],
      teacherId: "teacher-layla",
      teacherName: "Layla Al-Khazraji",
      teacherNameAr: "ليلى الخزرجي",
      dueAt: daysFromNow(2, 16),
      status: "published",
      attachments: [],
    },
  ];

  const now = new Date().toISOString();
  for (const item of homework) {
    await db.collection("homework").add({
      ...item,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log("Seeded Al-Mutafawqeen homework PWA.");
  console.log("Teacher login: ahmed /", PASSWORD);
  console.log("Student login: pick grade + section (try الثاني متوسط / شعبة أ)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
