#!/usr/bin/env python3
"""
Expands compact recipe definitions into full glossary JSON.

Compact format (one dict per recipe):
{
  "id": "kung-pao-chicken",
  "name": "Kung Pao Chicken",
  "desc": "Spicy stir-fried chicken with peanuts and dried chilies",
  "time": "25 min",
  "diff": "Medium",
  "ing": [["chicken breast","400","g"],["peanuts","50","g"],["dried red chilies","6"],["soy sauce","2","tbsp"],...],
  "steps": ["Cut chicken into cubes, marinate with soy sauce and cornstarch for 15 min.",...],
  "tips": ["Use Sichuan peppercorns for authentic numbing spice."],
  "cal": 380, "protein": "32g", "carbs": "18g", "fat": "20g", "servings": 2,
  "cuisine": ["Chinese"],
  "diet": ["gluten-free","nut-free"],  # what it IS (tags)
  "meals": ["lunch","dinner"],
  "region": "east-asian",
  "tags": []  # health tags like "fried", "high-sugar"
}

Usage: python3 expand-recipes.py input.json output.json
"""
import json, sys

def expand(compact):
    ingredients = []
    for ing in compact["ing"]:
        item = {"name": ing[0]}
        if len(ing) > 1 and ing[1]:
            item["quantity"] = str(ing[1])
        if len(ing) > 2 and ing[2]:
            item["unit"] = ing[2]
        ingredients.append(item)

    return {
        "id": compact["id"],
        "name": compact["name"],
        "description": compact["desc"],
        "cookTime": compact["time"],
        "difficulty": compact["diff"],
        "ingredients": ingredients,
        "instructions": compact["steps"],
        "tips": compact.get("tips", []),
        "nutritionInfo": {
            "servings": compact.get("servings", 2),
            "calories": compact.get("cal", 300),
            "protein": compact.get("protein", "15g"),
            "carbs": compact.get("carbs", "30g"),
            "fat": compact.get("fat", "12g"),
        },
        "cuisine": compact["cuisine"],
        "dietaryTags": compact.get("diet", []),
        "mealTypes": compact["meals"],
        "region": compact["region"],
        "tags": compact.get("tags", []),
        "source": "seed",
        "useCount": 0,
        "avgRating": 0,
        "lastUsedAt": "",
        "createdAt": "2026-03-08T00:00:00.000Z",
    }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 expand-recipes.py input.json output.json")
        sys.exit(1)
    with open(sys.argv[1]) as f:
        compact_list = json.load(f)
    expanded = [expand(r) for r in compact_list]
    with open(sys.argv[2], "w") as f:
        json.dump(expanded, f, indent=2)
    print(f"Expanded {len(expanded)} recipes → {sys.argv[2]}")
