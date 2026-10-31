// Server-side session log: every step check (with its crop image) and every voice
// event lands in logs/<sessionId>/events.jsonl, so any run can be replayed exactly.
// `npm run logs` prints the latest session. logs/ is gitignored (it holds the kid's voice transcripts).
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "logs");
const safe = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "unknown";

export async function logEvent(sessionId: string | null, type: string, data: Record<string, unknown>): Promise<void> {
  try {
    const dir = path.join(ROOT, safe(sessionId ?? "no-session"));
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "events.jsonl"), JSON.stringify({ t: new Date().toISOString(), type, ...data }) + "\n");
  } catch (e) {
    // Read-only filesystems (e.g. Vercel) can't keep logs; never break the request over it.
    console.warn("[log] could not write:", (e as Error).message);
  }
}

// Saves a PNG data URL next to the events; returns the file name to reference in an event.
export async function logImage(sessionId: string | null, name: string, dataUrl: string): Promise<string | undefined> {
  try {
    const dir = path.join(ROOT, safe(sessionId ?? "no-session"));
    await mkdir(dir, { recursive: true });
    const file = `${safe(name)}.png`;
    await writeFile(path.join(dir, file), Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64"));
    return file;
  } catch {
    return undefined;
  }
}
