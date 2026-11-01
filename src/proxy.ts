import { NextResponse, type NextRequest } from "next/server";
import { INVITE_COOKIE, inviteCode, inviteHash } from "@/lib/invite/code";

// Hosted site only (INVITE_CODE set): the app and every API need the invite cookie, so nobody without
// the code can spend the Gemini key. Open: the landing page, shared report links (/report#r=…, the data
// is in the fragment), the invite page itself, and static files.
const OPEN = [/^\/$/, /^\/report\/?$/, /^\/invite\/?$/, /^\/api\/invite\/?$/];

export async function proxy(request: NextRequest) {
  const code = inviteCode();
  if (!code) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (OPEN.some((re) => re.test(pathname))) return NextResponse.next();
  if (request.cookies.get(INVITE_COOKIE)?.value === (await inviteHash(code))) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "invite code needed" }, { status: 401 });
  const url = request.nextUrl.clone();
  url.pathname = "/invite";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // everything except Next's static files and public assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|woff2?)$).*)"],
};
