import { requireProfile } from "@/lib/session";
import { subscribeLiveSnapshot } from "@/lib/homework";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireProfile();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      unsubscribe = subscribeLiveSnapshot(user, {
        onData: (snapshot, meta) => {
          send("snapshot", snapshot);
          const kinds = meta?.kinds?.length ? meta.kinds : ["modified"];
          send("change", { kinds, serverTime: snapshot.serverTime });
          if (kinds.includes("added")) send("insert", { serverTime: snapshot.serverTime });
          if (kinds.includes("modified")) send("update", { serverTime: snapshot.serverTime });
          if (kinds.includes("removed")) send("delete", { serverTime: snapshot.serverTime });
        },
        onError: (error) => send("sync-error", { message: error.message }),
      });

      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 15000);

      const close = () => {
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", close);
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
