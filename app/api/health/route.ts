import { NextResponse } from "next/server";
import { adminDb, isEmulator } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const emulator = isEmulator();
  let firestore: "ok" | "error" = "ok";
  let message = "";
  try {
    await adminDb().collection("subjects").limit(1).get();
  } catch (error) {
    firestore = "error";
    message = error instanceof Error ? error.message : "Firestore unavailable";
  }

  const live = firestore === "ok" && !emulator;
  return NextResponse.json(
    {
      ok: live,
      env: process.env.NODE_ENV ?? "unknown",
      emulator,
      firestore,
      ...(message ? { message } : {}),
    },
    { status: live ? 200 : 503 }
  );
}
