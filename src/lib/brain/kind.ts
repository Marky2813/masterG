import type { QuestionKind } from "../types";

// Question kind from typed/mathjs text (no model needed).
export function kindOf(text: string): QuestionKind {
  const letters = text.replace(/\b(lcm|hcf|gcd)\b/gi, "").match(/[a-z]/i);
  return text.includes("=") && letters ? "equation" : "chain";
}
