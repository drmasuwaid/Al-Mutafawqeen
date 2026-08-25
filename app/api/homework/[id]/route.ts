import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/session";
import { deleteHomework, updateHomework } from "@/lib/homework";
import { saveHomeworkFiles } from "@/lib/files";
import { adminDb } from "@/lib/firebase-admin";
import type { Attachment } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function parseBody(request: Request) {
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

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const { payload, files } = await parseBody(request);
    const classIds = Array.isArray(payload.classIds)
      ? payload.classIds.map(String).filter(Boolean)
      : undefined;
    const keep = Array.isArray(payload.attachments)
      ? (payload.attachments as Attachment[])
      : [];
    const uploaded = files.length ? await saveHomeworkFiles(id, files) : [];
    await updateHomework(user, id, {
      title: payload.title ? String(payload.title) : payload.titleAr ? String(payload.titleAr) : undefined,
      titleAr: payload.titleAr ? String(payload.titleAr) : undefined,
      details: payload.details ? String(payload.details) : payload.detailsAr ? String(payload.detailsAr) : undefined,
      detailsAr: payload.detailsAr ? String(payload.detailsAr) : undefined,
      subjectId: payload.subjectId ? String(payload.subjectId) : undefined,
      classId: classIds?.[0],
      classIds,
      dueAt:
        payload.dueAt === undefined
          ? undefined
          : payload.dueAt
            ? new Date(String(payload.dueAt)).toISOString()
            : null,
      attachments: [...keep, ...uploaded],
    });
    if (uploaded.length) {
      await adminDb().doc(`homework/${id}`).update({
        attachments: [...keep, ...uploaded],
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر تعديل الواجب" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteHomework(user, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حذف الواجب" },
      { status: 400 }
    );
  }
}
