// Invite-code gate, shared by the proxy (src/proxy.ts) and /api/invite. The gate is on only when the
// server has INVITE_CODE set (the hosted site); local dev runs open. The cookie holds a hash of the
// code, never the code itself.
export const INVITE_COOKIE = "mg_invite";
export const INVITE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function inviteHash(code: string): Promise<string> {
  const data = new TextEncoder().encode(`masterg-invite:${code.trim().toLowerCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const inviteCode = () => process.env.INVITE_CODE?.trim() || "";
