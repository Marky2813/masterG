import { Modality, Type, type LiveConnectConfig } from "@google/genai";
import type { Language } from "../types";
import { masterjiPrompt } from "./persona";

export const MASTERJI_VOICE = process.env.NEXT_PUBLIC_MASTERJI_VOICE || "Charon"; // pitch probe on gemini-3.1-flash-live-preview 2026-10-31: Charon 147 Hz (lowest), Iapetus 160, Orus 164, Fenrir 195

export const WRITE_NOTE = {
  name: "write_note",
  description:
    "Write a short red-pen note (max 24 characters) right next to one of the child's steps, e.g. 'LCM(4, 6) = 12', '3/4 = 9/12', 'sign badlo!'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      clusterId: { type: Type.STRING, description: "The step id from the latest note, e.g. c3" },
      text: { type: Type.STRING, description: "The note, max 24 characters" },
    },
    required: ["clusterId", "text"],
  },
};

export const WRITE_LINE = {
  name: "write_line",
  description:
    "Write one full line of working in red pen on the board, under the child's work, like a teacher showing a step: e.g. '3/4 + 1/6 = 9/12 + 2/12', 'LCM(4, 6) = 12'. Max 40 characters. Use only numbers from the FACTS notes.",
  parameters: {
    type: Type.OBJECT,
    properties: { text: { type: Type.STRING, description: "The line to write, max 40 characters" } },
    required: ["text"],
  },
};

export const WRITE_WORKING = {
  name: "write_working",
  description:
    "Teach a method on the board: write 2-6 short lines one under another, like a teacher working it out, e.g. ['multiples of 4: 4, 8, 12', 'multiples of 6: 6, 12', 'LCM = 12']. Each line max 40 characters. Use the METHOD lines from FACTS.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Optional heading, e.g. 'LCM kaise nikaalein'" },
      lines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-6 lines, top to bottom" },
    },
    required: ["lines"],
  },
};

export const SET_QUESTION = {
  name: "set_question",
  description:
    "Put the NEXT sum on the board when the child has finished one and wants another. Clears the page. Use plain maths text like '2/3 + 1/5' or '4x - 7 = 9'.",
  parameters: {
    type: Type.OBJECT,
    properties: { question: { type: Type.STRING, description: "The new sum, e.g. 2/3 + 1/5" } },
    required: ["question"],
  },
};

export const DRAW_GRAPH = {
  name: "draw_graph",
  description:
    "Draw a graph on the board in red pen and circle where the lines cross. Pass the child's equations exactly as written, e.g. ['3x + 5 = 20'] or ['8x + 2y = 4', '3x + y = 1'], or expressions in x like ['3x + 5', '20']. The board works out the crossing and returns it as crossesAt: say THAT number, and only after the result comes back.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      lines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Equations or expressions in x, e.g. ['8x + 2y = 4', '3x + y = 1'] or ['3x + 5', '20']" },
      markX: { type: Type.NUMBER, description: "Optional: roughly where you expect the crossing" },
    },
    required: ["lines"],
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
    tools: [{ functionDeclarations: [WRITE_NOTE, WRITE_LINE, WRITE_WORKING, SET_QUESTION, DRAW_GRAPH] }],
  };
}
