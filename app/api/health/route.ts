import { NextResponse } from "next/server";
import { adminDb, isEmulator } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const emulator = isEmulator();
  let firestore: "ok" | "error" = "ok";
  try {
    await adminDb().collection("subjects").limit(1).get();
  } catch {
    firestore = "error";
  }

  const live = firestore === "ok" && !emulator;
  return NextResponse.json({ ok: live }, { status: live ? 200 : 503 });
}
