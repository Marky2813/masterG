import { logEvent } from "@/lib/log/server";

// Client events (voice transcripts, hidden notes, verdicts, cluster events) → logs/<session>/events.jsonl.
export async function POST(request: Request) {
  try {
    const { type, data } = (await request.json()) as { type: string; data?: Record<string, unknown> };
    await logEvent(request.headers.get("x-session-id"), `client.${String(type).slice(0, 40)}`, data ?? {});
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
