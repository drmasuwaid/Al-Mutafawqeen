import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_FILES = [".env.local", ".env.production", ".env"];

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function loadDotenv() {
  for (const file of ENV_FILES) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index < 1) continue;
      const key = trimmed.slice(0, index).trim();
      if (!key || process.env[key]) continue;
      process.env[key] = stripQuotes(trimmed.slice(index + 1).trim());
    }
  }
}

export function emulatorHostsSet() {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIREBASE_STORAGE_EMULATOR_HOST
  );
}

export function assertNotEmulator() {
  if (emulatorHostsSet()) {
    console.error(
      "Emulator hosts are set. Unset FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST, and FIREBASE_STORAGE_EMULATOR_HOST before talking to production Firebase."
    );
    process.exit(1);
  }
}

export function parseServiceAccount() {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (filePath) {
    const path = resolve(process.cwd(), filePath);
    if (!existsSync(path)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH not found: ${path}`);
    }
    return JSON.parse(readFileSync(path, "utf8"));
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) {
    throw new Error(
      "Set FIREBASE_SERVICE_ACCOUNT (JSON or base64) or FIREBASE_SERVICE_ACCOUNT_PATH."
    );
  }
  const candidates = [raw];
  if (!raw.startsWith("{")) {
    candidates.push(Buffer.from(raw, "base64").toString("utf8"));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed.private_key === "string") {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }
      return parsed;
    } catch {
      /* try next */
    }
  }
  throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
}

export function requiredProjectId() {
  const id =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "";
  if (!id) {
    throw new Error("FIREBASE_PROJECT_ID is required.");
  }
  return id;
}
