import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/session";
import { createHomework, loadLiveSnapshot } from "@/lib/homework";

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
      dueAt?: string;
    };
    if (
      !body.title?.trim() ||
      !body.titleAr?.trim() ||
      !body.subjectId ||
      !body.classId ||
      !body.dueAt
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const id = await createHomework(user, {
      title: body.title.trim(),
      titleAr: body.titleAr.trim(),
      details: (body.details ?? "").trim(),
      detailsAr: (body.detailsAr ?? "").trim(),
      subjectId: body.subjectId,
      classId: body.classId,
      dueAt: new Date(body.dueAt).toISOString(),
      status: "published",
    });
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not publish" },
      { status: 400 }
    );
  }
}
