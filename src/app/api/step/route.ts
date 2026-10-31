import { judgeStep, type JudgeInput } from "@/lib/gemini/judge";
import { logEvent, logImage } from "@/lib/log/server";

// POST one cluster crop → reading + verdict. The key stays on the server.
// Every call is logged with its crop, context and full result (logs/<session>/).
export async function POST(request: Request) {
  const sessionId = request.headers.get("x-session-id");
  let body: JudgeInput & { clusterId?: string };
  try {
    body = (await request.json()) as JudgeInput & { clusterId?: string };
  } catch {
    return Response.json({ error: "bad JSON" }, { status: 400 });
  }
  if (typeof body.imagePng !== "string" || body.imagePng.length < 100) {
    return Response.json({ error: "imagePng missing" }, { status: 400 });
  }
  const image = await logImage(sessionId, `step-${Date.now()}-${body.clusterId ?? "x"}`, body.imagePng);
  const ctx = { clusterId: body.clusterId, question: body.question, previous: body.previous, kind: body.kind, image };
  try {
    const result = await judgeStep(body);
    await logEvent(sessionId, "step", { ...ctx, result });
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api/step]", message);
    await logEvent(sessionId, "step.error", { ...ctx, error: message });
    return Response.json({ error: message }, { status: 502 });
  }
}
