/**
 * Safe production bootstrap. Creates missing classes, subjects, and one
 * principal account. Never wipes collections. Never resets passwords.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json npm run seed:production
 */
import { randomBytes } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { classes, subjects } from "./school-catalog.mjs";
import {
  assertNotEmulator,
  loadDotenv,
  parseServiceAccount,
  requiredProjectId,
} from "./prod-env.mjs";

loadDotenv();
assertNotEmulator();

const projectId = requiredProjectId();
const serviceAccount = parseServiceAccount();

initializeApp({
  credential: cert(serviceAccount),
  projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
});

const auth = getAuth();
const db = getFirestore();

function randomPassword() {
  return randomBytes(18).toString("base64url");
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

async function ensureDocs(collectionName, items) {
  let created = 0;
  for (const item of items) {
    const { id, ...data } = item;
    const ref = db.doc(`${collectionName}/${id}`);
    const snap = await ref.get();
    if (snap.exists) continue;
    await ref.set(data);
    created += 1;
  }
  console.log(`${collectionName}: ${created} created, ${items.length - created} already present.`);
}

async function authUserExists(uid) {
  try {
    await auth.getUser(uid);
    return true;
  } catch {
    return false;
  }
}

async function ensurePrincipal() {
  const username = process.env.PRINCIPAL_USERNAME || "noura";
  const email = process.env.PRINCIPAL_EMAIL || "noura.admin@mutafawqeen.school";
  const uid = process.env.PRINCIPAL_UID || "admin-noura";
  const displayName = process.env.PRINCIPAL_NAME_EN || "Noura Abdelqader";
  const displayNameAr = process.env.PRINCIPAL_NAME_AR || "نورة عبد القادر";

  const [byUsername, admins] = await Promise.all([
    db.collection("users").where("username", "==", username).limit(1).get(),
    db.collection("users").where("role", "==", "admin").limit(1).get(),
  ]);

  if (!byUsername.empty || !admins.empty) {
    console.log("Principal already exists. Password was not changed.");
    return;
  }

  const existedInAuth = await authUserExists(uid);
  const generated = !process.env.PRINCIPAL_PASSWORD;
  const password = process.env.PRINCIPAL_PASSWORD || randomPassword();

  if (!existedInAuth) {
    await auth.createUser({
      uid,
      email,
      password,
      displayName,
      emailVerified: true,
    });
  }

  const profile = {
    email,
    username,
    displayName,
    displayNameAr,
    role: "admin",
    classIds: classes.map((item) => item.id),
    subjectIds: subjects.map((item) => item.id),
  };
  await db.doc(`users/${uid}`).set(profile, { merge: true });
  await db.doc(`teachers/${uid}`).set(
    {
      id: uid,
      name: displayNameAr,
      nameEn: displayName,
      username,
      email,
      role: "admin",
      subjectsGrades: subjectGradesFor(profile),
      classIds: profile.classIds,
      subjectIds: profile.subjectIds,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  if (existedInAuth) {
    console.log(
      `Auth user ${uid} already existed. Firestore profile was written. Password was not reset.`
    );
    return;
  }

  console.log(`Principal username: ${username}`);
  console.log(`Principal email:    ${email}`);
  if (generated) {
    console.log(`Principal password: ${password}`);
    console.log("Save this password now. It will not be shown again.");
  } else {
    console.log("Principal password: (taken from PRINCIPAL_PASSWORD)");
  }
}

async function main() {
  console.log(`Seeding production catalog for ${projectId} (missing docs only).`);
  await ensureDocs("classes", classes);
  await ensureDocs("subjects", subjects);
  await ensurePrincipal();
  console.log("Production seed finished. Teachers and homework were not modified.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
