import { cleanName, ID_RE, normalizeCode } from "@/lib/classroom/model";
import { joinClass } from "@/lib/classroom/store";

// POST { name, roll?, studentId? } -> { student }. studentId re-joins from the same device.
export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await ctx.params).code);
  let body: { name?: unknown; roll?: unknown; studentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const name = cleanName(body.name);
  if (!name) return Response.json({ error: "write your name" }, { status: 400 });
  const existing = typeof body.studentId === "string" && ID_RE.test(body.studentId) ? body.studentId : undefined;
  try {
    const student = await joinClass(code, name, cleanName(body.roll, 10) || undefined, existing);
    return Response.json({ student });
  } catch (e) {
    const message = (e as Error).message;
    return Response.json({ error: message }, { status: message === "no such class" ? 404 : 400 });
  }
}
