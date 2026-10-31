import { judgeStep, type JudgeInput } from "@/lib/gemini/judge";

// POST one cluster crop → reading + verdict. The key stays on the server.
export async function POST(request: Request) {
  let body: JudgeInput;
  try {
    body = (await request.json()) as JudgeInput;
  } catch {
    return Response.json({ error: "bad JSON" }, { status: 400 });
  }
  if (typeof body.imagePng !== "string" || body.imagePng.length < 100) {
    return Response.json({ error: "imagePng missing" }, { status: 400 });
  }
  try {
    return Response.json(await judgeStep(body));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api/step]", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
