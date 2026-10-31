"use client";

// One session id per page load; sent with every request so server logs group by session.
let sessionId: string | null = null;
export function getSessionId(): string {
  if (!sessionId) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    sessionId = `${stamp}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return sessionId;
}

// Fire-and-forget event to logs/<session>/events.jsonl (voice transcripts, notes, verdicts...).
export function clientLog(type: string, data: Record<string, unknown> = {}): void {
  void fetch("/api/log", {
    method: "POST",
    headers: { "content-type": "application/json", "x-session-id": getSessionId() },
    body: JSON.stringify({ type, data }),
    keepalive: true,
  }).catch(() => {});
}
