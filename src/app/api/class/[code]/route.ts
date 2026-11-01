import { normalizeCode } from "@/lib/classroom/model";
import { getClass } from "@/lib/classroom/store";

// GET -> the class name for the join page. No roster: anyone with the code may see only this.
export async function GET(_request: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await ctx.params).code);
  const c = await getClass(code).catch(() => null);
  if (!c) return Response.json({ error: "no class with this code" }, { status: 404 });
  return Response.json({ code: c.code, name: c.name, grade: c.grade, school: c.school });
}
