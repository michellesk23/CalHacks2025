import { fetchOffProduct } from "./OpenFoodFactsClient";
import { GetEligibilityInputResult } from "../types/product";
import { normalizeOffProduct } from "./normalize";

export async function getEligibilityInput(barcode: string): Promise<GetEligibilityInputResult> {
  try {
    const resp = await fetchOffProduct(barcode);
    // Distinguish not found vs invalid
    if (!resp) return { ok: false, reason: "invalid_response" };
    if (resp.status !== 1) {
      return { ok: false, reason: "not_found" };
    }
    const normalized = normalizeOffProduct(resp);
    if (!normalized) return { ok: false, reason: "invalid_response" };
    return { ok: true, data: normalized };
  } catch (e: any) {
    return { ok: false, reason: "network_error" };
  }
}


