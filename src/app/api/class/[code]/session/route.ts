import { normalizeCode } from "@/lib/classroom/model";
import { putSession } from "@/lib/classroom/store";

// POST { studentId, sessionId, report }: saves (or replaces) one practice session for the teacher.
// POST, not PUT, so navigator.sendBeacon can send the last copy when the tab closes.
export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await ctx.params).code);
  let body: { studentId?: unknown; sessionId?: unknown; report?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  try {
    await putSession(code, String(body.studentId ?? ""), String(body.sessionId ?? ""), body.report);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
