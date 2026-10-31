"use client";

// Session facts that late joiners need (e.g. Masterji started after the question was set).
import { bus } from "./bus";
import type { QuestionKind } from "./types";

export const sessionState: { question: { text: string; kind: QuestionKind } | null } = { question: null };

bus.on("questionConfirmed", (q) => {
  sessionState.question = q;
});
