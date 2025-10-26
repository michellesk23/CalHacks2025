import { EligibilityInput } from "../types/product";

export type EligibilityResult =
  | { status: "unknown"; reason: "delegated" }
  | { status: "eligible" | "ineligible" | "unclear"; reason: string };

// Stub: your teammate will implement real logic and replace this.
export function computeEligibility(_input: EligibilityInput): EligibilityResult {
  return { status: "unknown", reason: "delegated" };
}


