import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/session";
import { deleteHomework, updateHomework } from "@/lib/homework";
import type { Attachment } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
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
    const classIds = body.classIds?.filter(Boolean);
    await updateHomework(user, id, {
      ...body,
      title: body.title ?? body.titleAr,
      details: body.details ?? body.detailsAr,
      classId: classIds?.[0] ?? body.classId,
      classIds,
      dueAt: body.dueAt === undefined ? undefined : body.dueAt ? new Date(body.dueAt).toISOString() : null,
    });
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
