import { readWorksheet } from "@/lib/gemini/question";
import { logEvent, logImage } from "@/lib/log/server";

// POST { imagePng?, text?, source } -> the teacher's homework as an ordered list of questions
// (a worksheet photo / screenshot, or pasted text). Logged with the image, like /api/question.
export async function POST(request: Request) {
  const sessionId = request.headers.get("x-session-id");
  let body: { imagePng?: string; text?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad JSON" }, { status: 400 });
  }
  const imagePng = typeof body.imagePng === "string" && body.imagePng.length >= 100 ? body.imagePng : undefined;
  const text = typeof body.text === "string" && body.text.trim() ? body.text.trim() : undefined;
  if (!imagePng && !text) return Response.json({ error: "image or text missing" }, { status: 400 });
  const image = imagePng ? await logImage(sessionId, `worksheet-${Date.now()}`, imagePng.replace(/^data:image\/[a-z+]+;base64,/, "data:image/png;base64,")) : undefined;
  try {
    const result = await readWorksheet({ imagePng, text });
    await logEvent(sessionId, "worksheet.read", { source: body.source, image, text, result });
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logEvent(sessionId, "worksheet.read_error", { source: body.source, image, text, error: message });
    return Response.json({ error: message }, { status: 502 });
  }
}
