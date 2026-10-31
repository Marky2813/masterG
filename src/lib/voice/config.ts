// Live API model. Override in .env.local with GEMINI_LIVE_MODEL; `npm run bench:models` lists what the key can use.
export const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-2.5-flash-native-audio-latest"; // probe 2026-10-31: answers text notes in ~3.5 s; preview-09-2025 ignores realtime text
