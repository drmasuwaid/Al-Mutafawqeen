import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const profile = await requireProfile();
  if (!profile) {
    return NextResponse.json({ profile: null }, { status: 401 });
  }
  return NextResponse.json({ profile });
}
