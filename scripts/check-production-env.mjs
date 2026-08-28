import {
  emulatorHostsSet,
  loadDotenv,
  parseServiceAccount,
  requiredProjectId,
} from "./prod-env.mjs";

loadDotenv();

const checks = [];

function note(ok, label, detail = "") {
  checks.push({ ok, label, detail });
}

try {
  requiredProjectId();
  note(true, "FIREBASE_PROJECT_ID");
} catch {
  note(false, "FIREBASE_PROJECT_ID", "مطلوب");
}

const apiKey =
  process.env.FIREBASE_WEB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
note(Boolean(apiKey), "FIREBASE_WEB_API_KEY", apiKey ? "" : "مطلوب (Web API Key من إعدادات المشروع)");

const secret = process.env.SESSION_SECRET || "";
if (!secret) {
  note(false, "SESSION_SECRET", "مطلوب في الإنتاج");
} else if (secret.length < 32) {
  note(false, "SESSION_SECRET", "اجعلها 32 حرفاً على الأقل — openssl rand -base64 48");
} else if (secret === "dev-only-school-task-flow-secret") {
  note(false, "SESSION_SECRET", "لا تستخدم سر التطوير في الإنتاج");
} else {
  note(true, "SESSION_SECRET", `${secret.length} حرفاً`);
}

try {
  parseServiceAccount();
  note(
    true,
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? "FIREBASE_SERVICE_ACCOUNT_PATH"
      : "FIREBASE_SERVICE_ACCOUNT"
  );
} catch (error) {
  note(false, "FIREBASE_SERVICE_ACCOUNT", error.message);
}

if (process.env.FIREBASE_STORAGE_BUCKET) {
  note(true, "FIREBASE_STORAGE_BUCKET");
} else {
  note(true, "FIREBASE_STORAGE_BUCKET", "غير معيّن — سيُستخدم PROJECT_ID.appspot.com");
}

if (emulatorHostsSet()) {
  note(
    false,
    "emulator hosts",
    "يجب أن تبقى فارغة في الإنتاج (FIRESTORE_EMULATOR_HOST وغيرها)"
  );
} else {
  note(true, "emulator hosts unset");
}

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  const mark = item.ok ? "OK  " : "FAIL";
  const extra = item.detail ? ` — ${item.detail}` : "";
  console.log(`${mark}  ${item.label}${extra}`);
}

if (failed.length) {
  console.error(`\n${failed.length} missing or invalid production setting(s).`);
  process.exit(1);
}

console.log("\nProduction environment looks ready.");
