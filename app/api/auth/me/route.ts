import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const profile = await requireProfile();
  return NextResponse.json({ profile });
}
