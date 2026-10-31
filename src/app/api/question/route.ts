import { readQuestion } from "@/lib/gemini/question";
import { logEvent, logImage } from "@/lib/log/server";

// POST { imagePng, source } -> the question read from a photo / screenshot / handwriting. Logged with the image.
export async function POST(request: Request) {
  const sessionId = request.headers.get("x-session-id");
  let body: { imagePng?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad JSON" }, { status: 400 });
  }
  if (typeof body.imagePng !== "string" || body.imagePng.length < 100) return Response.json({ error: "image missing" }, { status: 400 });
  const image = await logImage(sessionId, `question-${Date.now()}`, body.imagePng.replace(/^data:image\/[a-z+]+;base64,/, "data:image/png;base64,"));
  try {
    const result = await readQuestion(body.imagePng);
    await logEvent(sessionId, "question.read", { source: body.source, image, result });
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logEvent(sessionId, "question.read_error", { source: body.source, image, error: message });
    return Response.json({ error: message }, { status: 502 });
  }
}
