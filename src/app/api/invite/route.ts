import { timingSafeEqual } from "node:crypto";
import { INVITE_COOKIE, INVITE_MAX_AGE, inviteCode, inviteHash } from "@/lib/invite/code";

// POST { code } -> sets the invite cookie when the code matches INVITE_CODE. At most 10 tries per
// minute per address, so the code can't be guessed by brute force.
const tries = new Map<string, number[]>();

export async function POST(request: Request) {
  const expected = inviteCode();
  if (!expected) return Response.json({ ok: true }); // gate off (local dev)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (tries.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 10) return Response.json({ error: "Too many tries. Wait a minute." }, { status: 429 });
  tries.set(ip, [...recent, now]);
  let code = "";
  try {
    code = String(((await request.json()) as { code?: unknown }).code ?? "");
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const a = Buffer.from(await inviteHash(code));
  const b = Buffer.from(await inviteHash(expected));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "That code isn't right." }, { status: 403 });
  const res = Response.json({ ok: true });
  res.headers.append("set-cookie", `${INVITE_COOKIE}=${await inviteHash(expected)}; Path=/; Max-Age=${INVITE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
  return res;
}
