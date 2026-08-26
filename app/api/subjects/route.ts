import { NextResponse } from "next/server";
import { normalizeArabic } from "@/lib/arabic";
import { adminDb } from "@/lib/firebase-admin";
import { requireProfile } from "@/lib/session";
import { isPrincipal } from "@/lib/teachers";
import type { Subject } from "@/lib/types";

export const runtime = "nodejs";

function mapSubject(id: string, data: Record<string, unknown>): Subject {
  return {
    id,
    name: String(data.name ?? data.nameAr ?? id),
    nameAr: String(data.nameAr ?? data.name ?? id),
    color: String(data.color ?? "#2563eb"),
  };
}

function slugify(name: string) {
  const ascii = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (ascii.length >= 2 && ascii.length <= 40) return ascii;
  return `sub-${Date.now().toString(36)}`;
}

export async function GET() {
  const snap = await adminDb().collection("subjects").get();
  const subjects = snap.docs
    .map((doc) => mapSubject(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
  return NextResponse.json({ subjects });
}

export async function POST(request: Request) {
  const user = await requireProfile();
  if (!user || !isPrincipal(user)) {
    return NextResponse.json({ error: "صلاحية مدير المدرسة مطلوبة." }, { status: 403 });
  }
  const body = (await request.json()) as { nameAr?: string };
  const nameAr = body.nameAr?.trim();
  if (!nameAr) {
    return NextResponse.json({ error: "أدخل اسم المادة." }, { status: 400 });
  }

  const snap = await adminDb().collection("subjects").get();
  const needle = normalizeArabic(nameAr);
  const duplicate = snap.docs.find((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const label = String(data.nameAr ?? data.name ?? "");
    return normalizeArabic(label) === needle;
  });
  if (duplicate) {
    return NextResponse.json({
      subject: mapSubject(duplicate.id, duplicate.data() as Record<string, unknown>),
      existing: true,
    });
  }

  let id = slugify(nameAr);
  const ref = adminDb().doc(`subjects/${id}`);
  if ((await ref.get()).exists) {
    id = `${id}-${Date.now().toString(36)}`;
  }
  const subject: Subject = {
    id,
    name: nameAr,
    nameAr,
    color: "#2563eb",
  };
  await adminDb().doc(`subjects/${id}`).set({
    name: subject.name,
    nameAr: subject.nameAr,
    color: subject.color,
  });
  return NextResponse.json({ subject, existing: false });
}
