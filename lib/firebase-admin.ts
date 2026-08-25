import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function projectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "school-task-flow"
  );
}

function storageBucket() {
  return process.env.FIREBASE_STORAGE_BUCKET || `${projectId()}.appspot.com`;
}

function getApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccount) as object),
      projectId: projectId(),
      storageBucket: storageBucket(),
    });
  }

  return initializeApp({
    projectId: projectId(),
    storageBucket: storageBucket(),
  });
}

export function adminAuth() {
  return getAuth(getApp());
}

export function adminDb() {
  return getFirestore(getApp());
}

export function adminBucket() {
  return getStorage(getApp()).bucket();
}

export function isEmulator() {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIREBASE_STORAGE_EMULATOR_HOST
  );
}

export function authSignInUrl() {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "demo-api-key";
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (emulator) {
    const host = emulator.startsWith("http")
      ? emulator
      : `http://${emulator}`;
    return `${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  }
  return `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
}
