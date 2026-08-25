import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { readStoredFile } from "@/lib/files";
import { homeworkClassIds } from "@/lib/homework";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const storagePath = url.searchParams.get("path");
  const download = url.searchParams.get("download") === "1";
  if (!storagePath || storagePath.includes("..")) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const homeworkId = storagePath.split("/")[0];
  const snap = await adminDb().doc(`homework/${homeworkId}`).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const data = snap.data() ?? {};
  const owner = String(data.createdBy ?? data.teacherId ?? "");
  const ids = homeworkClassIds({
    classId: String(data.classId ?? ""),
    classIds: Array.isArray(data.classIds) ? data.classIds.map(String) : undefined,
  });
  const allowed =
    user.role === "admin" ||
    user.role === "teacher" ||
    (user.role === "student" && user.classId && ids.includes(user.classId)) ||
    user.uid === owner;
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const buffer = await readStoredFile(storagePath);
    const attachment = Array.isArray(data.attachments)
      ? data.attachments.find((item: { storagePath?: string }) => item.storagePath === storagePath)
      : null;
    const type = attachment?.type || "application/octet-stream";
    const name = attachment?.name || storagePath.split("/").pop() || "file";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
