import { Modality, StartSensitivity, Type, type LiveConnectConfig } from "@google/genai";
import type { Language } from "../types";
import { masterjiPrompt } from "./persona";

export const MASTERJI_VOICE = process.env.NEXT_PUBLIC_MASTERJI_VOICE || "Orus"; // pitch probe 2026-10-31: Orus 145 Hz (lowest); Charon 169 Hz

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
    realtimeInputConfig: { automaticActivityDetection: { startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW } },
    tools: [{ functionDeclarations: [WRITE_NOTE] }],
  };
}
