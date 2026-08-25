import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireProfile } from "@/lib/session";
import { allClasses } from "@/lib/catalog";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = await requireProfile();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    displayNameAr?: string;
    displayName?: string;
    username?: string;
  };
  const displayNameAr = body.displayNameAr?.trim();
  if (!displayNameAr) {
    return NextResponse.json({ error: "أدخل الاسم الظاهر." }, { status: 400 });
  }
  const patch: Record<string, string> = {
    displayNameAr,
    displayName: body.displayName?.trim() || displayNameAr,
  };
  if (body.username?.trim()) {
    patch.username = body.username.trim();
  }
  await adminDb().doc(`users/${user.uid}`).update(patch);
  return NextResponse.json({
    profile: {
      ...user,
      ...patch,
    },
  });
}

export async function PUT(request: Request) {
  const user = await requireProfile();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as { classIds?: string[] };
  const valid = new Set(allClasses().map((item) => item.id));
  const classIds = (body.classIds ?? []).filter((id) => valid.has(id));
  await adminDb().doc(`users/${user.uid}`).update({ classIds });
  return NextResponse.json({ profile: { ...user, classIds } });
}
