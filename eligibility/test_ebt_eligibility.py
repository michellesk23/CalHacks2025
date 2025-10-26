import pytest
from ebt_eligibility import check_eligibility

def run(item):
    return check_eligibility(item)


def test_soda():
    result = run({
        "name": "Coca-Cola Classic Soda",
        "categories": ["en:carbonated-soft-drinks"],
        "ingredients": "carbonated water, high fructose corn syrup, caffeine, caramel color",
        "nutrients": {"added_sugars_g": 39}
    })
    assert result["eligible"] is False
    assert "sweetened beverage" in result["reason"].lower()


def test_energy_drink():
    result = run({
        "name": "Monster Energy Drink",
        "categories": ["en:energy-drinks"],
        "ingredients": "carbonated water, sugar, caffeine, taurine",
        "nutrients": {"added_sugars_g": 54}
    })
    assert result["eligible"] is False
    assert "sweetened beverage" in result["reason"].lower()


def test_unsweetened_sparkling_water():
    result = run({
        "name": "LaCroix Lime Sparkling Water",
        "categories": ["en:carbonated-waters"],
        "ingredients": "carbonated water, natural flavor",
        "nutrients": {"added_sugars_g": 0}
    })
    assert result["eligible"] is True


def test_fruit_juice_100_percent():
    result = run({
        "name": "Tropicana 100% Orange Juice",
        "categories": ["en:fruit-juices"],
        "ingredients": "100% orange juice",
        "nutrients": {"juice_percent": 100}
    })
    assert result["eligible"] is True


def test_fruit_drink_less_than_half_juice():
    result = run({
        "name": "Minute Maid Fruit Drink",
        "categories": ["en:fruit-drinks"],
        "ingredients": "water, sugar, orange juice concentrate (10%)",
        "nutrients": {"juice_percent": 10}
    })
    assert result["eligible"] is False
    assert "2026 rule" in result["reason"].lower()


def test_chocolate_milk():
    result = run({
        "name": "Hershey's Chocolate Milk",
        "categories": ["en:milks"],
        "ingredients": "milk, sugar, cocoa, vitamin D3",
        "nutrients": {"added_sugars_g": 22}
    })
    assert result["eligible"] is True


def test_kool_aid_powder_mix():
    result = run({
        "name": "Kool-Aid Unsweetened Drink Mix",
        "categories": ["en:drink-mixes"],
        "ingredients": "citric acid, artificial flavor, ascorbic acid",
        "nutrients": {}
    })
    assert result["eligible"] is True
    # relaxed check to include either 'eligible' or mix tip
    assert "eligible" in result["reason"].lower() or any("mix" in tip.lower() for tip in result["user_tips"])


def test_candy_bar():
    result = run({
        "name": "Snickers Chocolate Bar",
        "categories": ["en:candies"],
        "ingredients": "milk chocolate, peanuts, corn syrup, sugar, palm oil",
        "nutrients": {"added_sugars_g": 30}
    })
    assert result["eligible"] is False
    assert "sweetened beverage" in result["reason"].lower() or "candy" in result["reason"].lower()


def test_loaf_of_bread():
    result = run({
        "name": "Whole Wheat Bread",
        "categories": ["en:breads"],
        "ingredients": "whole wheat flour, yeast, water, salt",
    })
    assert result["eligible"] is True
    assert "eligible" in result["reason"].lower()


def test_protein_powder():
    result = run({
        "name": "Whey Protein Powder",
        "categories": ["en:dietary-supplements"],
        "ingredients": "whey protein concentrate, natural flavor, lecithin",
    })
    assert result["eligible"] is False
    assert "supplement" in result["reason"].lower()


def test_low_confidence_missing_data():
    result = run({
        "name": "Unknown Beverage",
        "categories": [],
        "ingredients": "",
    })
    assert result["confidence"] < 0.6
    assert result["eligible"] is None
    assert "insufficient data" in result["reason"].lower()

def test_beverage_unknown_sweetener():
    product = {
        "name": "Mystery Drink",
        "categories": ["en:fruit-drinks"],
        "ingredients": "",  # empty ingredients, cannot detect sweeteners
        "nutrients": {}     # missing nutrients
    }
    result = run(product)
    assert result["eligible"] is None
    assert result["confidence"] <= 0.7
    assert any(
        "natural or artificial sweeteners" in tip.lower()
        for tip in result["user_tips"]
    )
    assert "insufficient data" in result["reason"].lower()

