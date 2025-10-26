export interface OffIngredient {
  text?: string;
  id?: string;
  percent?: number;
  percent_estimate?: number;
  percent_min?: number;
  percent_max?: number;
}

export interface OffProduct {
  code: string;
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  ingredients?: OffIngredient[];
  categories_tags?: string[];
  nutriments?: Record<string, number | string | undefined>;
  image_front_url?: string;
  image_url?: string;
  image_ingredients_url?: string;
  image_nutrition_url?: string;
  selected_images?: any;
}

export interface OffProductResponse {
  status: number; // 1 = found, 0 = not found
  code?: string;
  product?: OffProduct;
}

export interface NormalizedIngredient {
  text: string;
  percent?: number;
}

export interface EligibilityInput {
  barcode: string;
  name: string | null;
  brand: string | null;
  categories: string[];
  ingredientsText: string | null;
  ingredients: NormalizedIngredient[];
  nutrients: {
    sugars_100g?: number;
    energy_kcal_100g?: number;
    sodium_100g?: number;
    carbohydrates_100g?: number;
    proteins_100g?: number;
    fat_100g?: number;
  };
  juicePercent: number | null;
  imageFrontUrl: string | null;
  imageIngredientsUrl: string | null;
  imageNutritionUrl: string | null;
}

export type GetEligibilityInputResult =
  | { ok: true; data: EligibilityInput }
  | {
      ok: false;
      reason: "not_found" | "http_error" | "network_error" | "invalid_response";
      status?: number;
    };


