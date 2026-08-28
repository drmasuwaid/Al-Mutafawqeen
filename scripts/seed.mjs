import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { classes, subjects } from "./school-catalog.mjs";

// Local emulator only. This script wipes collections. Use `npm run seed:production`
// against a live Firebase project.
if (process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "Refusing to run the destructive emulator seed against a live Firebase project. Use npm run seed:production."
  );
  process.exit(1);
}

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8181";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "school-task-flow";
const PASSWORD = "LiveSync2026";

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

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

function subjectGradesFor(user) {
  if (!user.classIds || !user.subjectIds) return [];
  const rows = [];
  for (const classId of user.classIds) {
    const [gradeId, sectionId] = classId.split("-");
    for (const subjectId of user.subjectIds) {
      const sub = subjects.find((item) => item.id === subjectId);
      rows.push({
        id: `${classId}-${subjectId}`,
        gradeId,
        sectionId,
        subjectId,
        subjectNameAr: sub?.nameAr ?? subjectId,
      });
    }
  }
  return rows;
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
  if (user.role === "teacher" || user.role === "admin") {
    const subjectsGrades = subjectGradesFor(user);
    await db.doc(`teachers/${uid}`).set({
      id: uid,
      name: user.displayNameAr,
      nameEn: user.displayName,
      username: user.username,
      email: user.email,
      role: user.role,
      subjectsGrades,
      classIds: user.classIds ?? [],
      subjectIds: user.subjectIds ?? [],
      updatedAt: new Date().toISOString(),
    });
  }
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
  await wipeCollection("teachers");

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
      title: "Al-Mutanabbi summary",
      titleAr: "تلخيص قصيدة المتنبي",
      details: "Write a one-page summary and list three rhetorical devices.",
      detailsAr:
        "اكتب تلخيصاً بصفحة واحدة للقصيدة التي نوقشت في الصف، واذكر ثلاثة من المحسنات البديعية.",
      subjectId: "arabic",
      classId: "s4-a",
      classIds: ["s4-a"],
      teacherId: "teacher-layla",
      createdBy: "teacher-layla",
      createdByNameAr: "ليلى الخزرجي",
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
