import { normalizeCode } from "@/lib/classroom/model";
import { checkKey, listSessions, publicInfo } from "@/lib/classroom/store";

// GET (header x-teacher-key) -> { info, sessions }: the roster and every saved session report.
// The dashboard computes its roll-ups from these (classOverview in src/lib/classroom/model.ts).
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await ctx.params).code);
  const c = await checkKey(code, request.headers.get("x-teacher-key")).catch(() => null);
  if (!c) return Response.json({ error: "wrong class code or teacher link" }, { status: 403 });
  return Response.json({ info: publicInfo(c), sessions: await listSessions(code) });
}
