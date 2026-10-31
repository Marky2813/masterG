import { GoogleGenAI } from "@google/genai";
import { LIVE_MODEL } from "@/lib/voice/config";
import { liveConfig } from "@/lib/voice/liveConfig";
import { logEvent } from "@/lib/log/server";
import type { Language } from "@/lib/types";

// Mints a short-lived, single-use Live API token so the browser never sees GEMINI_API_KEY.
// The whole config (voice, persona, tools) is locked into the token: a token that only
// names the model locks the config to defaults, which silently dropped our voice before.
export async function POST(request: Request) {
  const sessionId = request.headers.get("x-session-id");
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY missing: put it in .env.local" }, { status: 500 });
  }
  let language: Language = "hinglish";
  try {
    const body = (await request.json()) as { language?: Language };
    if (body.language === "english") language = "english";
  } catch {
    /* default */
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { apiVersion: "v1alpha" } });
    const now = Date.now();
    const config = liveConfig(language);
    // One retry: a network blip ("fetch failed") shouldn't kill the session start on stage.
    const create = () => ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
        liveConnectConstraints: { model: LIVE_MODEL, config },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });
    let token;
    try {
      token = await create();
    } catch (e) {
      await logEvent(sessionId, "voice.token_retry", { error: (e as Error).message });
      token = await create();
    }
    await logEvent(sessionId, "voice.token", { model: LIVE_MODEL, language, voice: config.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName });
    return Response.json({ token: token.name, model: LIVE_MODEL, language });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api/live-token]", message);
    await logEvent(sessionId, "voice.token_error", { error: message });
    return Response.json({ error: message }, { status: 502 });
  }
}
