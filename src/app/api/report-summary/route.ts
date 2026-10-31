import { parseReport, type Report } from "@/lib/report/model";
import { writeSummary } from "@/lib/report/summary";
import { logEvent } from "@/lib/log/server";

// POST { report } -> { summary }: the AI "For the teacher" note, written by Gemini Flash from the
// computed session facts only. Logged with the exact facts sent, so every summary can be replayed.
export async function POST(request: Request) {
  const sessionId = request.headers.get("x-session-id");
  let report: Report;
  try {
    const body = (await request.json()) as { report?: unknown };
    report = parseReport(body.report);
  } catch {
    return Response.json({ error: "bad report" }, { status: 400 });
  }
  if (!report.qs.some((q) => q.st.length)) return Response.json({ error: "no steps in this session yet" }, { status: 400 });
  try {
    const { summary, facts, ms } = await writeSummary({ ...report, ai: undefined });
    await logEvent(sessionId, "report.summary", { facts, summary, ms });
    return Response.json({ summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logEvent(sessionId, "report.summary_error", { error: message });
    return Response.json({ error: message }, { status: 502 });
  }
}
