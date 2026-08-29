import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/session";
import { createHomework, deleteHomework, loadLiveSnapshot } from "@/lib/homework";
import { assertHomeworkFile, sanitizeClientAttachments, saveHomeworkFiles } from "@/lib/files";
import { adminDb } from "@/lib/firebase-admin";

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

async function parsePublishBody(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const payload = JSON.parse(String(form.get("payload") || "{}")) as Record<string, unknown>;
    const files = form.getAll("files").filter((item): item is File => item instanceof File);
    return { payload, files };
  }
  return {
    payload: (await request.json()) as Record<string, unknown>,
    files: [] as File[],
  };
}

export async function POST(request: Request) {
  const user = await requireProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { payload, files } = await parsePublishBody(request);
    const titleAr = String(payload.titleAr || payload.title || "").trim();
    const detailsAr = String(payload.detailsAr || payload.details || "").trim();
    const subjectId = String(payload.subjectId || "").trim();
    const classIds = (
      Array.isArray(payload.classIds)
        ? payload.classIds.map(String)
        : payload.classId
          ? [String(payload.classId)]
          : []
    ).filter(Boolean);
    if (!titleAr || !subjectId || !classIds.length) {
      return NextResponse.json({ error: "أكمل حقول الواجب قبل النشر." }, { status: 400 });
    }
    const dueAt = payload.dueAt ? new Date(String(payload.dueAt)).toISOString() : null;
    const existing = sanitizeClientAttachments(
      Array.isArray(payload.attachments) ? payload.attachments : []
    );
    files.forEach(assertHomeworkFile);
    const id = await createHomework(user, {
      title: String(payload.title || titleAr).trim(),
      titleAr,
      details: String(payload.details || detailsAr).trim(),
      detailsAr,
      subjectId,
      classId: classIds[0],
      classIds,
      dueAt,
      attachments: existing,
      status: "published",
    });
    try {
      if (files.length) {
        const saved = await saveHomeworkFiles(id, files);
        await adminDb()
          .doc(`homework/${id}`)
          .update({ attachments: [...existing, ...saved] });
      }
    } catch (error) {
      await deleteHomework(user, id).catch(() => undefined);
      throw error;
    }
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر نشر الواجب" },
      { status: 400 }
    );
  }
}
