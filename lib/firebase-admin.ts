import { existsSync, readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function emulatorHostsSet() {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIREBASE_STORAGE_EMULATOR_HOST
  );
}

export function isEmulator() {
  return emulatorHostsSet();
}

function isLiveProduction() {
  return process.env.NODE_ENV === "production" && !emulatorHostsSet();
}

export function projectId() {
  const id =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    "";
  if (id) return id;
  if (isLiveProduction()) {
    throw new Error("FIREBASE_PROJECT_ID is required in production.");
  }
  return "school-task-flow";
}

function storageBucket() {
  return process.env.FIREBASE_STORAGE_BUCKET || `${projectId()}.appspot.com`;
}

function parseServiceAccountJson(raw: string): ServiceAccount {
  const trimmed = raw.trim();
  const candidates = [trimmed];
  if (!trimmed.startsWith("{")) {
    candidates.push(Buffer.from(trimmed, "base64").toString("utf8"));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as ServiceAccount & { private_key?: string };
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.private_key === "string") {
          parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
        }
        return parsed;
      }
    } catch {
      /* try to repair literal newlines inside private_key */
    }
  }
  const repaired = trimmed.replace(
    /("private_key"\s*:\s*")([\s\S]*?)("\s*,)/,
    (_full, start: string, key: string, end: string) =>
      `${start}${key.replace(/\r?\n/g, "\\n")}${end}`
  );
  try {
    return JSON.parse(repaired) as ServiceAccount;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT must be valid JSON (single line or base64) or set FIREBASE_SERVICE_ACCOUNT_PATH."
    );
  }
}

function readServiceAccount(): ServiceAccount | null {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH not found: ${filePath}`);
    }
    return JSON.parse(readFileSync(filePath, "utf8")) as ServiceAccount;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return parseServiceAccountJson(raw);
  return null;
}

function hasGoogleDefaultCredentials() {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.K_SERVICE ||
      process.env.FIREBASE_CONFIG ||
      process.env.GOOGLE_CLOUD_PROJECT
  );
}

function getApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  if (process.env.NODE_ENV === "production" && emulatorHostsSet()) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST / FIREBASE_STORAGE_EMULATOR_HOST must not be set in production."
    );
  }

  const account = readServiceAccount();
  const options = {
    projectId: projectId(),
    storageBucket: storageBucket(),
  };

  if (account) {
    return initializeApp({
      ...options,
      credential: cert(account),
    });
  }

  if (emulatorHostsSet() || hasGoogleDefaultCredentials()) {
    return initializeApp(options);
  }

  throw new Error(
    "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_SERVICE_ACCOUNT_PATH."
  );
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

export function webApiKey() {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
  if (apiKey) return apiKey;
  if (emulatorHostsSet()) return "demo-api-key";
  throw new Error("FIREBASE_WEB_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY is required.");
}

export function authSignInUrl() {
  const apiKey = webApiKey();
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (emulator) {
    const host = emulator.startsWith("http") ? emulator : `http://${emulator}`;
    return `${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  }
  return `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
}
