import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8181";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FIREBASE_PROJECT_ID = "school-task-flow";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "school-task-flow";
process.env.FIREBASE_STORAGE_BUCKET = "school-task-flow.appspot.com";
process.env.SESSION_SECRET ||= "dev-only-school-task-flow-secret";
process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = "1";

const PORT = process.env.PORT || "43123";
const children = [];

function run(command, args, extra = {}) {
  const child = spawn(command, args, {
    stdio: extra.stdio ?? "inherit",
    env: { ...process.env, ...extra.env },
    shell: extra.shell ?? false,
  });
  children.push(child);
  child.on("exit", (code) => {
    if (extra.exitOnClose) {
      shutdown(code ?? 0);
    }
  });
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function waitForAuth() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch("http://127.0.0.1:9099/");
      if (res.ok || res.status === 404) return;
    } catch {
      /* still booting */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Firebase Auth emulator did not start.");
}

async function waitForStorage() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch("http://127.0.0.1:9199/storage/v1/b");
      if (res.ok || res.status === 400 || res.status === 404) return;
    } catch {
      /* still booting */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Firebase Storage emulator did not start.");
}

async function seed() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/seed.mjs"], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`seed failed with code ${code}`));
    });
  });
}

const firebaseBin = require.resolve("firebase-tools/lib/bin/firebase.js");
run(process.execPath, [
  firebaseBin,
  "emulators:start",
  "--only",
  "auth,firestore,storage",
  "--project",
  "school-task-flow",
]);

await waitForAuth();
await waitForStorage();
await seed();

run(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "dev", "--port", PORT, "--hostname", "0.0.0.0"],
  { exitOnClose: true }
);
