import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/session";
import { createHomework, loadLiveSnapshot } from "@/lib/homework";
import type { Attachment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snapshot = await loadLiveSnapshot(user);
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  const user = await requireProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      title?: string;
      titleAr?: string;
      details?: string;
      detailsAr?: string;
      subjectId?: string;
      classId?: string;
      classIds?: string[];
      dueAt?: string | null;
      attachments?: Attachment[];
    };
    const titleAr = (body.titleAr || body.title || "").trim();
    const detailsAr = (body.detailsAr || body.details || "").trim();
    const classIds = (body.classIds?.length ? body.classIds : body.classId ? [body.classId] : [])
      .map((id) => id.trim())
      .filter(Boolean);
    if (!titleAr || !body.subjectId || !classIds.length) {
      return NextResponse.json({ error: "أكمل حقول الواجب قبل النشر." }, { status: 400 });
    }
    const id = await createHomework(user, {
      title: (body.title || titleAr).trim(),
      titleAr,
      details: (body.details || detailsAr).trim(),
      detailsAr,
      subjectId: body.subjectId,
      classId: classIds[0],
      classIds,
      dueAt: body.dueAt ? new Date(body.dueAt).toISOString() : null,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      status: "published",
    });
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر نشر الواجب" },
      { status: 400 }
    );
  }
}
