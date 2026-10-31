// Shared contract between Notebook (P1), Voice (P2) and Brain (P3).
// Frozen in hour 0 — change only after telling the team. See PLAN.md §8.

export type Language = "hinglish" | "english";
export type Mode = "proactive" | "reactive";

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
  t: number;
}

export interface Stroke {
  id: string;
  points: Point[];
}

// A group of strokes the kid wrote close together in space and time.
// All AI marks are placed on cluster bboxes; the model never invents coordinates.
export interface Cluster {
  id: string;
  bbox: BBox;
  strokeIds: string[];
}

export type QuestionKind =
  | "chain" // fractions, decimals, BODMAS, LCM/HCF, exponents
  | "equation" // linear equation in one variable
  | "vertical" // long division / column layouts
  | "word_problem"
  | "unsupported"; // graphs, constructions, "explain why"

export type VerdictStatus = "correct" | "wrong" | "unsure";

export type MarkType = "tick" | "cross" | "circle" | "underline" | "arrow" | "none";

export type HintRung = 0 | 1 | 2 | 3 | 4; // 0 = no hint; 1 point, 2 narrow, 3 lead, 4 show

export interface ErrorCategory {
  id: string; // e.g. "add_across"
  label: string; // Hinglish label, e.g. "numerator aur denominator dono add kar diye"
  seed: boolean; // false if created during the session
}

export interface Verdict {
  clusterId: string;
  status: VerdictStatus;
  mark: MarkType;
  text: string; // what we read, in mathjs syntax
  category?: string; // ErrorCategory.id
  categoryIsNew?: boolean;
  categoryLabel?: string; // ErrorCategory.label for `category`, so listeners (the report) needn't keep the list (added 2026-11-01)
  repeatCount: number; // how many times this category has happened this session (1 = first time)
  hintRung: HintRung;
  hint?: string; // what Masterji should get across at this rung (Voice phrases it)
  source: "model" | "checker"; // who decided the status
  handwriting?: "neat" | "ok" | "messy"; // Flash's read of the crop: Masterji asks for neater writing (added 2026-11-01)
  handwritingNote?: string; // e.g. "the 6 looks like a 0"
}

// Which homework a question belongs to (a worksheet the teacher gave, read by /api/worksheet).
// Reports group questions by `id`. Added 2026-11-01, additive.
export interface HomeworkRef {
  id: string; // one per loaded worksheet
  index: number; // 0-based position in the homework; show index + 1
  total: number;
  title?: string; // e.g. "Exercise 7.6"
}

export interface MasterGEvents {
  clusterUpdated: { id: string; bbox: BBox; imagePng: string; strokeIds: string[] };
  clusterRemoved: { id: string };
  questionSubmitted: { source: "handwritten" | "photo" | "typed"; imagePng?: string; text?: string };
  questionConfirmed: { text: string; kind: QuestionKind; homework?: HomeworkRef }; // homework: set when the question comes from the teacher's homework (added 2026-11-01)
  verdict: Verdict;
  writeNote: { clusterId: string; text: string };
  writeLine: { text: string };
  drawGraph: { lines: { expr: string; label?: string }[]; xMin?: number; xMax?: number; markX?: number }; // Masterji draws a graph (added 2026-10-31) // Masterji writes a full worked line on the board, below the kid's work (added 2026-10-31)
  drawCounting: { a: number; b: number; op: "+" | "-" }; // counting sticks for Classes 1-2 (added 2026-11-01)
  userUtterance: { text: string };
  modeChanged: { mode: Mode };
  languageChanged: { language: Language };
}
