import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireProfile } from "@/lib/session";

export const runtime = "nodejs";

function slugify(name: string) {
  const ascii = name.trim().toLowerCase().replace(/\s+/g, "-");
  if (/^[a-z0-9-]{2,40}$/.test(ascii)) return ascii;
  return `sub-${Date.now().toString(36)}`;
}

export async function GET() {
  const snap = await adminDb().collection("subjects").get();
  const subjects = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: String(data.name ?? data.nameAr ?? doc.id),
      nameAr: String(data.nameAr ?? data.name ?? doc.id),
      color: String(data.color ?? "#2563eb"),
    };
  });
  return NextResponse.json({ subjects });
}

export async function POST(request: Request) {
  const user = await requireProfile();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as { nameAr?: string };
  const nameAr = body.nameAr?.trim();
  if (!nameAr) {
    return NextResponse.json({ error: "أدخل اسم المادة." }, { status: 400 });
  }
  const existing = await adminDb().collection("subjects").where("nameAr", "==", nameAr).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    return NextResponse.json({ subject: { id: doc.id, ...doc.data() } });
  }
  const id = slugify(nameAr);
  const subject = {
    name: nameAr,
    nameAr,
    color: "#2563eb",
  };
  await adminDb().doc(`subjects/${id}`).set(subject);
  return NextResponse.json({ subject: { id, ...subject } });
}
