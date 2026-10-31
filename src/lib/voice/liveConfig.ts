import { Modality, Type, type LiveConnectConfig } from "@google/genai";
import type { Language } from "../types";
import { masterjiPrompt } from "./persona";

export const MASTERJI_VOICE = process.env.NEXT_PUBLIC_MASTERJI_VOICE || "Charon"; // pitch probe on gemini-3.1-flash-live-preview 2026-10-31: Charon 147 Hz (lowest), Iapetus 160, Orus 164, Fenrir 195

export const WRITE_NOTE = {
  name: "write_note",
  description:
    "Write a short red-pen margin note (max 12 characters) next to one step on the child's notebook, e.g. 'LCM?', 'carry 1', '9/12'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      clusterId: { type: Type.STRING, description: "The step id from the latest note, e.g. c3" },
      text: { type: Type.STRING, description: "The note, max 12 characters" },
    },
    required: ["clusterId", "text"],
  },
};

// The one Live config. The token route locks it server-side (so voice + persona are
// guaranteed applied) and the client connects with the same object.
export function liveConfig(language: Language, voice = MASTERJI_VOICE): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    systemInstruction: masterjiPrompt(language),
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    // Push-to-talk: the kid holds a key/button to speak (activityStart/End). No voice-activity
    // detection, so Masterji never hears himself through the speakers. PLAN.md §6 "stage mode".
    realtimeInputConfig: { automaticActivityDetection: { disabled: true } },
    tools: [{ functionDeclarations: [WRITE_NOTE] }],
  };
}
