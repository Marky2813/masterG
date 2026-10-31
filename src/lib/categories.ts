import type { ErrorCategory } from "./types";

// Seed list for the mistake memory. The model must reuse one of these (or one
// created earlier in the session) before inventing a new category.
export const SEED_CATEGORIES: ErrorCategory[] = [
  { id: "add_across", label: "numerator aur denominator dono add kar diye", seed: true },
  { id: "carry_forgot", label: "carry bhool gaye", seed: true },
  { id: "borrow_error", label: "borrow galat liya", seed: true },
  { id: "decimal_misaligned", label: "decimal point line mein nahi", seed: true },
  { id: "bodmas_order", label: "BODMAS ka order galat", seed: true },
  { id: "table_slip", label: "table galat yaad hai", seed: true },
  { id: "simplify_incomplete", label: "poora simplify nahi kiya", seed: true },
  { id: "copied_wrong", label: "question galat utaara", seed: true },
  { id: "sign_transpose", label: "side badalte waqt sign nahi badla", seed: true },
  { id: "distribute_partial", label: "bracket poora multiply nahi kiya", seed: true },
];
