import type { ErrorCategory } from "./types";

// Seed list for the mistake memory. Labels are plain English: they show in the teacher report and dashboard.
// The model must reuse one of these (or one
// created earlier in the session) before inventing a new category.
export const SEED_CATEGORIES: ErrorCategory[] = [
  { id: "add_across", label: "added numerators and denominators straight across", seed: true },
  { id: "carry_forgot", label: "forgot to carry", seed: true },
  { id: "borrow_error", label: "borrowed wrongly", seed: true },
  { id: "decimal_misaligned", label: "decimal points not lined up", seed: true },
  { id: "bodmas_order", label: "wrong order of operations (BODMAS)", seed: true },
  { id: "table_slip", label: "multiplication table slip", seed: true },
  { id: "simplify_incomplete", label: "did not simplify fully", seed: true },
  { id: "copied_wrong", label: "copied the question wrongly", seed: true },
  { id: "sign_transpose", label: "did not change the sign when moving a term across", seed: true },
  { id: "distribute_partial", label: "did not multiply every term in the bracket", seed: true },
];
