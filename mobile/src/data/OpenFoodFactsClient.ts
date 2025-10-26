import { OffProductResponse } from "../types/product";

const USER_AGENT = "SnapCheck/0.1 (contact@example.com)";

export async function fetchOffProduct(barcode: string): Promise<OffProductResponse> {
  const fields = [
    "code",
    "product_name",
    "brands",
    "ingredients_text",
    "ingredients",
    "categories_tags",
    "nutriments",
  ].join(",");

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode
  )}.json?fields=${encodeURIComponent(fields)}`;

  let res: any;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });
  } catch (e) {
    return { status: 0 } as OffProductResponse; // Will be interpreted upstream as network_error
  }

  if (!res.ok) {
    return { status: 0 } as OffProductResponse; // Upstream can map http_error with status
  }

  const json = (await res.json()) as OffProductResponse;
  return json;
}


