import { cleanName } from "@/lib/classroom/model";
import { createClass } from "@/lib/classroom/store";

// POST { name, grade?, school? } -> { info, key }. The key is shown to the teacher once (in their
// private dashboard link); the server keeps only its hash.
export async function POST(request: Request) {
  let body: { name?: unknown; grade?: unknown; school?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const name = cleanName(body.name, 50);
  if (!name) return Response.json({ error: "give the class a name" }, { status: 400 });
  try {
    const { info, key } = await createClass({ name, grade: cleanName(body.grade, 10) || undefined, school: cleanName(body.school, 60) || undefined });
    return Response.json({ info, key });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
