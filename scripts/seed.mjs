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

const classes = [
  { id: "g4a", name: "Fourth Scientific A", nameAr: "الرابع العلمي أ", grade: 4, section: "A" },
  { id: "g4b", name: "Fourth Scientific B", nameAr: "الرابع العلمي ب", grade: 4, section: "B" },
  { id: "g5a", name: "Fifth Scientific A", nameAr: "الخامس العلمي أ", grade: 5, section: "A" },
  { id: "g6a", name: "Sixth Scientific A", nameAr: "السادس العلمي أ", grade: 6, section: "A" },
];

const subjects = [
  { id: "arabic", name: "Arabic", nameAr: "اللغة العربية", color: "#b45309" },
  { id: "english", name: "English", nameAr: "اللغة الإنكليزية", color: "#1d4ed8" },
  { id: "french", name: "French", nameAr: "اللغة الفرنسية", color: "#7c3aed" },
  { id: "math", name: "Mathematics", nameAr: "الرياضيات", color: "#0f766e" },
  { id: "physics", name: "Physics", nameAr: "الفيزياء", color: "#0369a1" },
  { id: "chemistry", name: "Chemistry", nameAr: "الكيمياء", color: "#be123c" },
  { id: "biology", name: "Biology", nameAr: "علم الأحياء", color: "#15803d" },
  { id: "islamic", name: "Islamic Education", nameAr: "التربية الإسلامية", color: "#365314" },
  { id: "computer", name: "Computer", nameAr: "الحاسوب", color: "#334155" },
];

const users = [
  {
    uid: "admin-noura",
    email: "noura.admin@mutafawqeen.school",
    displayName: "Noura Abdelqader",
    displayNameAr: "نورة عبد القادر",
    role: "admin",
  },
  {
    uid: "teacher-layla",
    email: "layla.arabic@mutafawqeen.school",
    displayName: "Layla Al-Khazraji",
    displayNameAr: "ليلى الخزرجي",
    role: "teacher",
    classIds: ["g4a", "g4b"],
    subjectIds: ["arabic"],
  },
  {
    uid: "teacher-omar",
    email: "omar.math@mutafawqeen.school",
    displayName: "Omar Al-Jubouri",
    displayNameAr: "عمر الجبوري",
    role: "teacher",
    classIds: ["g5a", "g6a"],
    subjectIds: ["math"],
  },
  {
    uid: "student-ahmed",
    email: "ahmed.g4a@mutafawqeen.school",
    displayName: "Ahmed Mohammed",
    displayNameAr: "أحمد محمد",
    role: "student",
    classId: "g4a",
  },
  {
    uid: "student-sara",
    email: "sara.g4a@mutafawqeen.school",
    displayName: "Sara Hassan",
    displayNameAr: "سارة حسن",
    role: "student",
    classId: "g4a",
  },
  {
    uid: "student-fatima",
    email: "fatima.g5a@mutafawqeen.school",
    displayName: "Fatima Ali",
    displayNameAr: "فاطمة علي",
    role: "student",
    classId: "g5a",
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

async function main() {
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

  const existing = await db.collection("homework").get();
  for (const doc of existing.docs) {
    const completions = await doc.ref.collection("completions").get();
    const batch = db.batch();
    completions.docs.forEach((row) => batch.delete(row.ref));
    batch.delete(doc.ref);
    await batch.commit();
  }

  const homework = [
    {
      title: "Lesson summary: Al-Mutanabbi",
      titleAr: "تلخيص قصيدة المتنبي",
      details: "Write a one-page summary of the poem discussed in class and list three rhetorical devices.",
      detailsAr: "اكتب تلخيصاً بصفحة واحدة للقصيدة التي نوقشت في الصف، واذكر ثلاثة من المحسنات البديعية.",
      subjectId: "arabic",
      classId: "g4a",
      teacherId: "teacher-layla",
      teacherName: "Layla Al-Khazraji",
      teacherNameAr: "ليلى الخزرجي",
      dueAt: daysFromNow(-1, 20),
      status: "published",
    },
    {
      title: "Worksheet: quadratic equations",
      titleAr: "ورقة عمل: المعادلات التربيعية",
      details: "Complete exercises 4 to 12 in the booklet. Show every step.",
      detailsAr: "أكمل التمارين من 4 إلى 12 في الكراس مع إظهار خطوات الحل.",
      subjectId: "math",
      classId: "g5a",
      teacherId: "teacher-omar",
      teacherName: "Omar Al-Jubouri",
      teacherNameAr: "عمر الجبوري",
      dueAt: daysFromNow(0, 21),
      status: "published",
    },
    {
      title: "Reading: the school garden",
      titleAr: "قراءة: حديقة المدرسة",
      details: "Read the text on page 48 and answer the comprehension questions.",
      detailsAr: "اقرأ النص في الصفحة 48 وأجب عن أسئلة الاستيعاب.",
      subjectId: "arabic",
      classId: "g4a",
      teacherId: "teacher-layla",
      teacherName: "Layla Al-Khazraji",
      teacherNameAr: "ليلى الخزرجي",
      dueAt: daysFromNow(2, 16),
      status: "published",
    },
    {
      title: "Limits practice set",
      titleAr: "تمارين النهايات",
      details: "Solve the even-numbered problems from chapter 3.",
      detailsAr: "حل المسائل ذات الأرقام الزوجية من الفصل الثالث.",
      subjectId: "math",
      classId: "g6a",
      teacherId: "teacher-omar",
      teacherName: "Omar Al-Jubouri",
      teacherNameAr: "عمر الجبوري",
      dueAt: daysFromNow(5, 16),
      status: "published",
    },
  ];

  const now = new Date().toISOString();
  for (const item of homework) {
    const ref = await db.collection("homework").add({
      ...item,
      createdAt: now,
      updatedAt: now,
    });
    if (item.classId === "g4a" && item.subjectId === "arabic" && item.dueAt === homework[0].dueAt) {
      await ref.collection("completions").doc("student-sara").set({
        studentName: "Sara Hassan",
        studentNameAr: "سارة حسن",
        status: "done",
        completedAt: now,
        note: "",
      });
    }
  }

  console.log("Seeded Al-Mutafawqeen demo school.");
  console.log("Password for every demo account:", PASSWORD);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
