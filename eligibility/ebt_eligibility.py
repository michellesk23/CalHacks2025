import re
from datetime import date

POLICY_VERSION = "ID-HB109-v2-2026"

def estimate_juice_percent(ingredients_text: str) -> float:
    """Heuristically estimate juice content percentage from ingredients."""
    if not ingredients_text:
        return 0.0
    text = ingredients_text.lower()
    match = re.search(r'(\d{1,3})\s*%[^a-z]*juice', text)
    if match:
        return float(match.group(1))
    first_ingredients = [ing.strip() for ing in text.split(",")[:2]]
    if any("juice" in ing for ing in first_ingredients):
        return 100.0
    if "juice" in text:
        return 25.0
    return 0.0


def check_eligibility(product: dict) -> dict:
    """
    Determine Idaho EBT eligibility based on HB109 + 2026 sweetened beverage ban.
    Returns dict with eligible, reason, confidence, policy_version, user_tips.
    """

    categories = product.get("categories", [])
    nutrients = product.get("nutrients", {})
    ingredients = product.get("ingredients", "").lower()
    name = product.get("name", "").lower()
    barcode = str(product.get("barcode", ""))

    confidence = 1.0
    eligible = True
    reason = None
    user_tips = []

    # --- 1️⃣ Missing data penalties ---
    if not categories:
        confidence -= 0.25
        user_tips.append("Check the product type — sodas and candies are not eligible, but staple foods are.")
    if not nutrients:
        confidence -= 0.15
    if not ingredients:
        confidence -= 0.10
    if not categories and not ingredients:
        confidence -= 0.1  # both missing → extra penalty

    # --- 2️⃣ Ingredient ambiguity ---
    if ingredients and len(ingredients.split(",")) < 3 and not any(
        word in ingredients for word in ["sugar", "juice", "milk", "sweetener"]
    ):
        confidence -= 0.1
        user_tips.append("Ingredient list is minimal or vague; verify the label for clarity.")

    # --- 3️⃣ Category genericness ---
    if categories and len(categories) <= 2 and all(
        kw in categories[0] for kw in ["beverages", "foods"]
    ):
        confidence -= 0.05  # mild penalty for generic categories

    # --- 4️⃣ Idaho disallowed categories ---
    banned_categories = {
        "en:candies", "en:carbonated-soft-drinks", "en:energy-drinks",
        "en:sweetened-beverages", "en:sugar-sweetened-beverages"
    }

    if any(cat in banned_categories for cat in categories):
        eligible = False
        reason = "Candy, soda, or sweetened beverage not covered under Idaho SNAP (HB109)."

    # --- 5️⃣ Idaho 2026 sweetened beverage ban ---
    if eligible and any("beverages" in cat or "drinks" in cat for cat in categories):
        sweetener_keywords = [ 
            "sugar", "corn syrup", "high fructose", "stevia", "sucralose",
            "aspartame", "acesulfame", "monk fruit", "saccharin", "honey"
        ]
        has_sweetener = any(s in ingredients for s in sweetener_keywords)

        juice_percent = estimate_juice_percent(ingredients)
        milk_based = any("milk" in cat for cat in categories)
        mixable = any(word in name for word in ["mix", "powder", "concentrate"])

        if has_sweetener:
            # Coca-Cola Zero–like products: artificially sweetened, no sugar info
            if "aspartame" in ingredients or "sucralose" in ingredients or "acesulfame" in ingredients:
                confidence -= 0.1  # confident it's banned, but uncertain nuance
            if not milk_based and juice_percent <= 50 and not mixable:
                eligible = False
                reason = (
                    "Banned under Idaho 2026 rule: sweetened nonalcoholic beverages not eligible "
                    "unless >50% juice, milk-based, or mixable."
                )
        else:
            # Heuristic juice estimation (no explicit %)
            if "juice" in ingredients and not re.search(r'\d{1,3}\s*%', ingredients):
                confidence -= 0.15
                user_tips.append(
                "Juice mentioned but no % provided so estimate may be uncertain; check the label for exact juice content. "
                "If there's at least 50% juice, it's eligible"
                )
                juice_potential = True
            # --- Sweetener unknown / missing ---
            if not nutrients.get("total_sugars_g"):
                eligible = None
                confidence = min(confidence, 0.7)
                reason = "Insufficient data to determine eligibility."
                if (juice_potential == False):
                    user_tips.append(
                        "Check if this beverage contains natural or artificial sweeteners. If so, it is most likely not eligible."
                    )    

        # Edge case: borderline juice %
        if 40 <= juice_percent <= 60:
            confidence -= 0.05

    # --- 6️⃣ Federal disallowed items ---
    federal_disallowed_keywords = ["alcohol", "hot", "supplement"]
    federal_disallowed_categories = ["en:dietary-supplements"]
    if any(f in name for f in federal_disallowed_keywords) or any(
        c in categories for c in federal_disallowed_categories
    ):
        eligible = False
        reason = "Federal rule: hot foods, alcohol, and supplements not eligible."

    # --- 7️⃣ Non-US barcode → minor uncertainty
    if barcode and not barcode.startswith(("0", "1")):
        confidence -= 0.1
        user_tips.append("Barcode may not correspond to a U.S. product; verify country of origin.")

    # --- 8️⃣ Confidence threshold ---
    if confidence < 0.6:
        return {
            "eligible": None,
            "reason": "Insufficient data to determine eligibility.",
            "confidence": round(confidence, 2),
            "policy_version": POLICY_VERSION,
            "user_tips": user_tips or ["Try scanning again or check the product label."]
        }

    return {
        "eligible": eligible,
        "reason": reason or "Eligible under Idaho SNAP policy.",
        "confidence": round(max(confidence, 0.0), 2),
        "policy_version": POLICY_VERSION,
        "user_tips": user_tips
    }


def format_off_product(product_info: dict) -> dict:
    """
    Convert a product dict from Open Food Facts-like format to the structure
    expected by check_eligibility().
    
    Expected input format:
    {
        "Barcode": str,
        "Name": str,
        "Categories": [str],
        "Ingredients": str,
        "Sugar (g)": int or float
    }
    
    Returns:
        dict suitable for check_eligibility()
    """
    return {
        "name": product_info.get("Name", ""),
        "categories": product_info.get("Categories", []),
        "ingredients": product_info.get("Ingredients", "").lower(),
        "nutrients": {
            "total_sugars_g": product_info.get("Sugar (g)", None)
        }
    }

#tests
if __name__ == "__main__":
    import json

    # Original Open Food Facts-like product data
    off_products = [
        {
            "Barcode": "025000040801",
            "Name": "Simply Orange With Mango",
            "Categories": [
                "en:plant-based-foods-and-beverages",
                "en:beverages",
                "en:plant-based-beverages"
            ],
            "Ingredients": "Contains orange juice, mango puree, natural flavors.",
            "Sugar (g)": 25
        },
        {
            "Barcode": "025000040825",
            "Name": "Simply Orange With Pineapple",
            "Categories": [
                "en:plant-based-foods-and-beverages",
                "en:beverages",
                "en:plant-based-beverages"
            ],
            "Ingredients": "Orange and pineapple juices, natural flavors.",
            "Sugar (g)": 10
        },
        {
            "Barcode": "028400040044",
            "Name": "Chili Cheese Flavored Corn Chips",
            "Categories": [
                "en:snacks",
                "en:salty-snacks",
                "en:appetizers",
                "en:chips-and-fries",
                "en:crisps",
                "en:corn-chips"
            ],
            "Ingredients": (
                "Corn, corn oil, whey, salt, spices, maltodextrin (made from corn), "
                "cheddar cheese (milk, cheese cultures, enzymes), canola oil, potassium chloride, "
                "tomato powder, monosodium glutamate, onion powder, natural flavors, "
                "Romano cheese (cow's milk, cheese cultures, salt, enzymes), dextrose, buttermilk, "
                "sodium caseinate, annatto extracts, cream, salt, citric acid, sunflower oil, "
                "garlic powder, disodium inosinate, disodium guanylate, and caramel color."
            ),
            "Sugar (g)": 0
        },
        {
            "Barcode": "5449000131805",
            "Name": "Coca-Cola Zero",
            "Categories": [
                "en:beverages-and-beverages-preparations",
                "en:beverages",
                "en:carbonated-drinks",
                "en:artificially-sweetened-beverages",
                "en:sodas",
                "en:diet-beverages",
                "en:colas",
                "en:diet-sodas",
                "en:diet-cola-soft-drink"
            ],
            "Ingredients": (
                "carbonated water, colour (caramel e150d), acid (phosphoric acid), "
                "sweeteners (aspartame, acesulfame k), natural flavourings (including caffeine), "
                "acidity regulator (sodium citrates) contains a source of phenylalanine"
            ),
            "Sugar (g)": None  # undefined
        }, 
        {
            "Barcode": "5449000131000",
            "Name": "Mystery Drink",
            "Categories": ["en:fruit-drinks"],
            "Ingredients": "Contains orange juice, mango puree, natural flavors.",  # empty ingredients, cannot detect sweeteners
            "Sugar (g)": None     # missing nutrients
        }
    ]

    # Loop through all products
    for product_info in off_products:
        formatted_product = format_off_product(product_info)
        result = check_eligibility(formatted_product)
        print(f"Product: {formatted_product['name']}")
        print(json.dumps(result, indent=4))
        print("\n" + "-"*80 + "\n")

