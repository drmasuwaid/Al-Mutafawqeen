import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/session";
import { setCompletion } from "@/lib/homework";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      homeworkId?: string;
      done?: boolean;
      note?: string;
    };
    if (!body.homeworkId) {
      return NextResponse.json({ error: "Missing homeworkId" }, { status: 400 });
    }
    await setCompletion(user, body.homeworkId, Boolean(body.done), body.note);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update" },
      { status: 400 }
    );
  }
}
