import { GoogleGenAI } from "@google/genai";
import { LIVE_MODEL } from "@/lib/voice/config";

// Mints a short-lived, single-use Live API token so the browser never sees GEMINI_API_KEY.
export async function POST() {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY missing: put it in .env.local" }, { status: 500 });
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { apiVersion: "v1alpha" } });
    const now = Date.now();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
        liveConnectConstraints: { model: LIVE_MODEL },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });
    return Response.json({ token: token.name, model: LIVE_MODEL });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api/live-token]", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
