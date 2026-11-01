import { classFacts, classOverview, normalizeCode } from "@/lib/classroom/model";
import { checkKey, listSessions, publicInfo } from "@/lib/classroom/store";
import { writeClassNote } from "@/lib/classroom/summary";
import { logEvent } from "@/lib/log/server";

// POST (header x-teacher-key) -> { summary }: Flash's "what to reteach" note from the class facts.
// Logged with the exact facts sent, so every note can be replayed.
export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await ctx.params).code);
  const c = await checkKey(code, request.headers.get("x-teacher-key")).catch(() => null);
  if (!c) return Response.json({ error: "wrong class code or teacher link" }, { status: 403 });
  const info = publicInfo(c);
  const facts = classFacts(info, classOverview(info, await listSessions(code)));
  if (!facts.sumsAttempted) return Response.json({ error: "no practice in this class yet" }, { status: 400 });
  const log = `class-${code}`;
  try {
    const { summary, ms } = await writeClassNote(facts);
    await logEvent(log, "class.summary", { facts, summary, ms });
    return Response.json({ summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logEvent(log, "class.summary_error", { error: message });
    return Response.json({ error: message }, { status: 502 });
  }
}
