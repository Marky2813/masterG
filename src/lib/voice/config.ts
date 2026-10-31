// Live API model. Override in .env.local with GEMINI_LIVE_MODEL; `npm run bench:models` lists what the key can use.
// Push-to-talk probe 2026-10-31 (scripts/ptt-probe.ts): 3.1-flash-live-preview answers ~0.7 s after a note and
// ~0.8 s after the kid releases the button; 2.5-flash-native-audio-latest took 2-7.7 s and 3.2 s.
export const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";
