#!/usr/bin/env python3
"""Generate the full breakfast recipe bank JSON for the glossary."""

import json
from datetime import datetime

NOW = "2026-03-09T00:00:00.000Z"

def make_id(name, cuisine):
    slug = name.lower()
    for ch in "()&|/,'\"!":
        slug = slug.replace(ch, "")
    slug = "-".join(slug.split())[:50]
    c = cuisine.lower().replace(" ", "-")[:20]
    return f"{slug}-{c}"

def recipe(name, desc, cook, diff, ingr, instr, tips, nut, cuisine, region, dtags, tags=None):
    c = [cuisine] if isinstance(cuisine, str) else cuisine
    return {
        "id": make_id(name, c[0]),
        "name": name,
        "description": desc,
        "cookTime": cook,
        "difficulty": diff,
        "ingredients": [{"name": i[0], "quantity": str(i[1]), "unit": i[2] if len(i) > 2 else ""} for i in ingr],
        "instructions": instr,
        "tips": tips,
        "nutritionInfo": {"servings": nut[0], "calories": nut[1], "protein": nut[2], "carbs": nut[3], "fat": nut[4]},
        "cuisine": c,
        "dietaryTags": dtags,
        "mealTypes": ["breakfast"],
        "region": region,
        "source": "curated",
        "tags": tags or [],
        "useCount": 0,
        "avgRating": 0,
        "lastUsedAt": NOW,
        "createdAt": NOW,
    }

VEG = ["vegetarian"]
VEGAN = ["vegetarian", "vegan", "dairy-free", "egg-free"]
VEGAN_GF = ["vegetarian", "vegan", "gluten-free", "dairy-free", "egg-free"]
VEG_GF = ["vegetarian", "gluten-free"]
EGG = ["egg-free"]  # NOT egg-free, has eggs
NON_VEG = []

recipes = []

# ===================== SOUTH INDIAN =====================

recipes.append(recipe(
    "Idli", "Soft steamed rice and lentil cakes, a classic South Indian breakfast served with chutney and sambar.",
    "30 min", "Medium",
    [("rice", 2, "cups"), ("urad dal", 1, "cup"), ("fenugreek seeds", "1/2", "tsp"), ("salt", 1, "tsp")],
    ["Soak rice and urad dal separately for 6 hours.", "Grind to a smooth batter, mix, add salt.", "Ferment overnight.", "Pour into idli moulds, steam for 10-12 minutes."],
    ["Fermentation is key — keep in a warm spot."], (4, 130, "4g", "26g", "0.5g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Rava Idli", "Soft semolina idli made without fermentation, quick and fluffy.",
    "20 min", "Easy",
    [("rava/semolina", 1, "cup"), ("curd", "1/2", "cup"), ("mustard seeds", "1/2", "tsp"), ("cashews", 6, ""), ("curry leaves", 6, ""), ("ENO fruit salt", 1, "tsp")],
    ["Roast rava lightly, cool. Mix with curd, water to a thick batter.", "Temper mustard seeds, curry leaves, cashews in ghee, add to batter.", "Add ENO, mix gently, pour into moulds, steam 10 min."],
    ["Add ENO just before steaming for fluffy texture."], (4, 180, "5g", "30g", "4g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Oats Idli", "Healthy idli made with oats instead of rice batter, steamed and light.",
    "15 min", "Easy",
    [("rolled oats", 1, "cup"), ("curd", "1/2", "cup"), ("rava", "1/4", "cup"), ("carrots", "1/4", "cup"), ("ENO", 1, "tsp")],
    ["Dry roast oats and rava. Mix with curd and water.", "Add grated carrots and salt.", "Add ENO, pour into moulds, steam 10 min."],
    ["Use instant oats for softer texture."], (4, 150, "6g", "24g", "3g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Ragi Idli", "Nutritious finger millet idli, high in calcium and iron.",
    "25 min", "Medium",
    [("ragi flour", 1, "cup"), ("urad dal", "1/2", "cup"), ("salt", 1, "tsp"), ("water", "", "as needed")],
    ["Soak urad dal 4 hours, grind smooth.", "Mix with ragi flour and salt.", "Ferment 8 hours. Pour into moulds, steam 12 min."],
    ["Ragi idli is denser than regular — slightly thinner batter helps."], (4, 140, "5g", "25g", "1g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Masala Dosa", "Crispy rice and lentil crepe filled with spiced potato masala.",
    "30 min", "Medium",
    [("dosa batter", 2, "cups"), ("potatoes", 3, "medium"), ("onion", 1, ""), ("mustard seeds", 1, "tsp"), ("turmeric", "1/2", "tsp"), ("oil", 2, "tbsp")],
    ["Boil and mash potatoes. Temper mustard seeds, add onions, turmeric, mashed potatoes.", "Spread dosa batter thin on hot tawa, drizzle oil.", "Place potato filling, fold and serve with chutney and sambar."],
    ["Use a well-seasoned cast iron tawa for crispiest dosa."], (2, 320, "8g", "48g", "10g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Plain Dosa", "Thin crispy rice and lentil crepe, a staple South Indian breakfast.",
    "20 min", "Easy",
    [("dosa batter", 2, "cups"), ("oil", 1, "tbsp"), ("salt", "", "to taste")],
    ["Heat tawa, spread batter in thin circle.", "Drizzle oil, cook until golden and crispy.", "Fold and serve with chutney and sambar."],
    ["Batter should be slightly thin for crispy dosa."], (2, 200, "5g", "36g", "4g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Rava Dosa", "Crispy semolina crepe with cumin and pepper, no fermentation needed.",
    "15 min", "Easy",
    [("rava", "1/2", "cup"), ("rice flour", "1/4", "cup"), ("maida", "1/4", "cup"), ("cumin seeds", 1, "tsp"), ("black pepper", "1/2", "tsp"), ("water", 2, "cups")],
    ["Mix all dry ingredients, add water to thin batter.", "Pour on hot tawa in lacy pattern.", "Cook until crisp, fold and serve."],
    ["Batter should be very thin and pourable."], (2, 220, "4g", "35g", "6g"),
    "Indian", "south-asian", VEGAN
))

recipes.append(recipe(
    "Moong Dal Dosa", "Protein-rich crepe made from ground moong dal, no fermentation.",
    "20 min", "Easy",
    [("moong dal", 1, "cup"), ("rice", "1/4", "cup"), ("ginger", 1, "inch"), ("cumin seeds", 1, "tsp"), ("green chili", 2, "")],
    ["Soak moong dal and rice 4 hours. Grind to smooth batter.", "Add ginger, cumin, chili. Spread on tawa, cook both sides."],
    ["Soak longer for easier grinding."], (2, 200, "12g", "30g", "3g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Brown Rice Dosa", "Healthy dosa made with brown rice for added fiber.",
    "25 min", "Medium",
    [("brown rice", 1, "cup"), ("urad dal", "1/3", "cup"), ("fenugreek seeds", "1/4", "tsp"), ("salt", 1, "tsp")],
    ["Soak brown rice and urad dal 6 hours.", "Grind, ferment overnight.", "Spread on tawa and cook until golden."],
    ["Brown rice takes longer to grind — soak extra hour."], (2, 210, "6g", "38g", "3g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Wheat Dosa", "Instant dosa made with whole wheat flour, no fermentation.",
    "10 min", "Easy",
    [("whole wheat flour", 1, "cup"), ("onion", 1, "small"), ("cumin seeds", 1, "tsp"), ("green chili", 1, ""), ("water", 1, "cup")],
    ["Mix flour with water, add chopped onion, cumin, chili.", "Spread on tawa like dosa, cook both sides."],
    ["Keep batter thin for crispy result."], (2, 180, "6g", "32g", "2g"),
    "Indian", "south-asian", VEGAN
))

recipes.append(recipe(
    "Oats Dosa", "Healthy instant dosa made with oats, onions, and spices.",
    "10 min", "Easy",
    [("rolled oats", 1, "cup"), ("rice flour", "1/4", "cup"), ("onion", 1, "small"), ("cumin seeds", 1, "tsp"), ("green chili", 1, "")],
    ["Blend oats coarsely. Mix with rice flour, water, spices.", "Spread on tawa, cook until crispy."],
    ["Don't make batter too thick."], (2, 170, "5g", "28g", "3g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Mixed Dal Dosa", "Protein-packed dosa from mixed lentils, no rice needed.",
    "25 min", "Medium",
    [("toor dal", "1/3", "cup"), ("moong dal", "1/3", "cup"), ("chana dal", "1/3", "cup"), ("ginger", 1, "inch"), ("cumin", 1, "tsp")],
    ["Soak all dals 4 hours. Grind to smooth batter.", "Spread on tawa and cook until golden on both sides."],
    ["Mix in a little rice for crispier texture."], (2, 210, "14g", "28g", "3g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Pesarattu", "Andhra-style green gram dosa, high in protein.",
    "20 min", "Easy",
    [("whole moong", 1, "cup"), ("ginger", 1, "inch"), ("green chilies", 3, ""), ("cumin seeds", 1, "tsp"), ("onion", 1, "small")],
    ["Soak moong 4 hours. Grind with ginger, chilies to thick batter.", "Add cumin. Spread on tawa, top with onion, cook until crisp."],
    ["Serve with ginger chutney for authentic flavor."], (2, 220, "14g", "30g", "2g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Neer Dosa", "Delicate lacy rice crepes from Karnataka, paper-thin.",
    "15 min", "Easy",
    [("rice", 1, "cup"), ("coconut", 2, "tbsp"), ("salt", "", "to taste"), ("water", 2, "cups")],
    ["Soak rice 4 hours. Grind with coconut to thin batter.", "Pour on hot tawa, swirl for lacy pattern. Cover and steam 1 min."],
    ["Do not flip — cook only one side."], (2, 170, "3g", "34g", "2g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Set Dosa", "Soft spongy dosa that's thick and fluffy, served in sets of 2-3.",
    "20 min", "Easy",
    [("dosa batter", 2, "cups"), ("baking soda", "1/4", "tsp"), ("oil", 1, "tbsp")],
    ["Add baking soda to well-fermented batter.", "Pour thick rounds on tawa, don't spread too thin.", "Cover and cook on low heat until set on top. Do not flip."],
    ["Use extra-fermented batter for best results."], (2, 200, "5g", "36g", "3g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Millet Dosa", "Nutritious dosa made with pearl millet (bajra), gluten-free.",
    "20 min", "Easy",
    [("bajra flour", 1, "cup"), ("rice flour", "1/4", "cup"), ("cumin seeds", 1, "tsp"), ("onion", 1, "small"), ("water", "1.5", "cups")],
    ["Mix flours with water, add cumin, chopped onion.", "Spread on hot tawa and cook both sides until golden."],
    ["Millet dosa is best served hot."], (2, 190, "5g", "32g", "3g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Ragi Dosa", "Healthy finger millet crepe rich in calcium and iron.",
    "15 min", "Easy",
    [("ragi flour", 1, "cup"), ("rice flour", "1/4", "cup"), ("onion", 1, "small"), ("cumin", 1, "tsp"), ("water", "1.5", "cups")],
    ["Mix flours with water, spices, diced onion.", "Spread on tawa and cook until crispy."],
    ["Add grated carrots for extra nutrition."], (2, 175, "5g", "30g", "2g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Quinoa Dosa", "Modern healthy dosa made with quinoa and urad dal.",
    "25 min", "Medium",
    [("quinoa", 1, "cup"), ("urad dal", "1/3", "cup"), ("salt", 1, "tsp"), ("water", "", "as needed")],
    ["Soak quinoa and urad dal 4 hours.", "Grind to smooth batter, ferment 6 hours.", "Spread on tawa and cook until golden."],
    ["Quinoa gives a nuttier flavor than rice dosa."], (2, 200, "8g", "32g", "3g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Adai Dosa", "Thick lentil and rice crepe with mixed dals and spices.",
    "25 min", "Medium",
    [("rice", "1/2", "cup"), ("toor dal", "1/4", "cup"), ("chana dal", "1/4", "cup"), ("urad dal", "1/4", "cup"), ("red chilies", 4, ""), ("curry leaves", 8, "")],
    ["Soak rice and all dals 2 hours.", "Grind coarsely with chilies and curry leaves.", "Spread thick on tawa, cook both sides with oil."],
    ["Coarse grinding is key — don't make it smooth like regular dosa."], (2, 250, "12g", "38g", "4g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Uttapam", "Thick savory rice and lentil pancake topped with vegetables.",
    "15 min", "Easy",
    [("dosa batter", 2, "cups"), ("onion", 1, "small"), ("tomato", 1, "small"), ("green chili", 1, ""), ("coriander", 2, "tbsp")],
    ["Pour thick batter on tawa.", "Top with diced onion, tomato, chili, coriander.", "Cook on medium heat until bottom is golden. Flip and cook other side."],
    ["Use thick, well-fermented batter for best uttapam."], (2, 230, "6g", "38g", "5g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Rava Uttapam", "Quick semolina pancake with vegetables, no fermentation needed.",
    "15 min", "Easy",
    [("rava", 1, "cup"), ("curd", "1/2", "cup"), ("onion", 1, "small"), ("tomato", 1, "small"), ("coriander", 2, "tbsp")],
    ["Mix rava with curd and water to thick batter. Rest 10 min.", "Pour on tawa, top with veggies.", "Cook both sides until golden."],
    ["Let batter rest to absorb moisture."], (2, 210, "6g", "34g", "5g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Medu Vada", "Crispy deep-fried urad dal doughnuts, a South Indian classic.",
    "30 min", "Medium",
    [("urad dal", 1, "cup"), ("ginger", 1, "inch"), ("green chilies", 2, ""), ("curry leaves", 8, ""), ("oil", "", "for frying")],
    ["Soak urad dal 4 hours. Grind to fluffy batter (don't add much water).", "Add ginger, chilies, curry leaves.", "Shape into donuts, deep fry until golden brown."],
    ["Batter should be thick and fluffy — the key to crispy vada."], (4, 180, "8g", "18g", "8g"),
    "Indian", "south-asian", VEGAN_GF, ["fried"]
))

recipes.append(recipe(
    "Paniyaram", "Round savory dumplings made from dosa batter in a special pan.",
    "15 min", "Easy",
    [("dosa batter", 2, "cups"), ("onion", 1, "small"), ("mustard seeds", 1, "tsp"), ("curry leaves", 6, ""), ("oil", 2, "tbsp")],
    ["Temper mustard seeds and curry leaves, add to batter with diced onion.", "Heat paniyaram pan, grease wells with oil.", "Pour batter, cook turning until golden all around."],
    ["Use well-fermented batter for fluffy paniyaram."], (4, 150, "4g", "24g", "4g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Appam", "Lacy bowl-shaped rice crepe with soft fluffy center, from Kerala.",
    "20 min", "Medium",
    [("rice", 1, "cup"), ("coconut milk", "1/2", "cup"), ("yeast", "1/2", "tsp"), ("sugar", 1, "tsp"), ("salt", "", "to taste")],
    ["Soak and grind rice. Add coconut milk, yeast, sugar. Ferment 6 hours.", "Pour in appam pan, swirl for thin edges.", "Cover and cook until center is fluffy and edges are lacy."],
    ["The pan must be very hot for lacy edges."], (2, 170, "3g", "32g", "3g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Podi Idli", "Leftover idli tossed with spicy podi (gun powder) and ghee.",
    "10 min", "Easy",
    [("idli", 6, ""), ("idli podi", 2, "tbsp"), ("ghee", 1, "tbsp"), ("sesame oil", 1, "tsp")],
    ["Cut idlis into quarters.", "Heat ghee and oil, toss idli pieces.", "Add podi powder, toss well until coated."],
    ["Use day-old idlis for best texture."], (2, 200, "5g", "30g", "7g"),
    "Indian", "south-asian", VEG_GF
))

recipes.append(recipe(
    "Punugulu", "Quick deep-fried dosa batter fritters, crispy outside and soft inside.",
    "15 min", "Easy",
    [("dosa batter", 2, "cups"), ("onion", 1, "small"), ("green chili", 1, ""), ("curry leaves", 6, ""), ("oil", "", "for frying")],
    ["Add diced onion, chili, curry leaves to thick batter.", "Drop spoonfuls into hot oil.", "Fry until golden brown and crispy."],
    ["Batter should be thick for round shape."], (4, 160, "4g", "22g", "6g"),
    "Indian", "south-asian", VEGAN_GF, ["fried"]
))

recipes.append(recipe(
    "Akki Roti", "Karnataka-style rice flour flatbread with vegetables.",
    "15 min", "Easy",
    [("rice flour", 1, "cup"), ("onion", 1, "small"), ("carrot", 1, "small"), ("dill", 2, "tbsp"), ("green chili", 1, ""), ("salt", 1, "tsp")],
    ["Mix rice flour with finely chopped vegetables, salt, and water.", "Pat into thin rounds on banana leaf or plastic.", "Cook on tawa with oil until both sides are golden."],
    ["Add sesame seeds for extra flavor."], (2, 190, "4g", "36g", "3g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Ven Pongal", "Comforting South Indian rice-lentil porridge tempered with pepper and cumin.",
    "25 min", "Easy",
    [("rice", 1, "cup"), ("moong dal", "1/2", "cup"), ("black pepper", 1, "tsp"), ("cumin seeds", 1, "tsp"), ("ghee", 2, "tbsp"), ("curry leaves", 8, ""), ("cashews", 8, "")],
    ["Dry roast moong dal. Cook rice and dal together until mushy.", "Temper pepper, cumin, curry leaves, cashews in ghee.", "Pour tempering over pongal, mix well."],
    ["Cook until creamy consistency — add more water if needed."], (2, 300, "9g", "42g", "10g"),
    "Indian", "south-asian", VEG_GF
))

recipes.append(recipe(
    "Idli Upma", "Leftover idli crumbled and tempered with spices — zero waste breakfast.",
    "10 min", "Easy",
    [("leftover idli", 6, ""), ("mustard seeds", 1, "tsp"), ("onion", 1, "small"), ("green chili", 1, ""), ("curry leaves", 6, ""), ("oil", 1, "tbsp")],
    ["Crumble idlis by hand.", "Temper mustard seeds, curry leaves, add onion and chili.", "Add crumbled idli, toss well. Squeeze lemon juice."],
    ["Great way to use day-old idlis."], (2, 180, "5g", "30g", "4g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Coconut Chutney", "Fresh coconut chutney with tempering, essential South Indian accompaniment.",
    "10 min", "Easy",
    [("fresh coconut", 1, "cup"), ("roasted chana dal", 1, "tbsp"), ("green chili", 2, ""), ("ginger", "1/2", "inch"), ("mustard seeds", 1, "tsp"), ("curry leaves", 6, "")],
    ["Grind coconut, chana dal, chili, ginger with water.", "Temper mustard seeds and curry leaves in oil.", "Pour tempering over chutney, mix."],
    ["Add a small piece of raw mango for tang."], (4, 80, "2g", "6g", "6g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Rava Kesari", "Sweet semolina halwa with ghee, cashews, and saffron.",
    "20 min", "Easy",
    [("rava", 1, "cup"), ("sugar", "3/4", "cup"), ("ghee", "1/4", "cup"), ("cashews", 10, ""), ("saffron", "a pinch", ""), ("cardamom", 2, "pods")],
    ["Roast rava in ghee until golden.", "Add hot water carefully, stir to avoid lumps.", "Add sugar, saffron, cardamom. Cook until thick. Garnish with cashews."],
    ["Use generous ghee for authentic taste."], (4, 280, "3g", "40g", "12g"),
    "Indian", "south-asian", VEG, ["high-sugar"]
))

# ===================== NORTH INDIAN =====================

recipes.append(recipe(
    "Aloo Paratha", "Stuffed potato flatbread cooked with ghee, a Punjabi breakfast staple.",
    "25 min", "Medium",
    [("whole wheat flour", 2, "cups"), ("potatoes", 3, "medium"), ("green chili", 2, ""), ("coriander", 2, "tbsp"), ("ghee", 2, "tbsp"), ("salt", 1, "tsp")],
    ["Knead dough. Boil, mash potatoes with spices.", "Stuff dough balls with potato mixture, roll out.", "Cook on tawa with ghee until golden on both sides."],
    ["Roll evenly to prevent filling from bursting out."], (2, 320, "8g", "44g", "12g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Gobi Paratha", "Spiced cauliflower stuffed whole wheat flatbread.",
    "25 min", "Medium",
    [("whole wheat flour", 2, "cups"), ("cauliflower", 1, "small"), ("green chili", 2, ""), ("garam masala", 1, "tsp"), ("ghee", 2, "tbsp")],
    ["Grate cauliflower, squeeze out water. Mix with spices.", "Stuff dough, roll out.", "Cook on tawa with ghee until golden."],
    ["Squeeze cauliflower well to prevent soggy parathas."], (2, 300, "8g", "40g", "11g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Mooli Paratha", "Spiced grated radish stuffed flatbread.",
    "25 min", "Medium",
    [("whole wheat flour", 2, "cups"), ("radish", 2, "medium"), ("green chili", 2, ""), ("coriander", 2, "tbsp"), ("ghee", 2, "tbsp")],
    ["Grate radish, squeeze water. Mix with spices.", "Stuff dough, roll, cook with ghee."],
    ["Salt the radish and drain to remove excess moisture."], (2, 280, "7g", "38g", "10g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Palak Paratha", "Spinach-infused green flatbread, nutritious and flavorful.",
    "20 min", "Easy",
    [("whole wheat flour", 2, "cups"), ("spinach", 1, "bunch"), ("green chili", 1, ""), ("cumin seeds", 1, "tsp"), ("ghee", 1, "tbsp")],
    ["Blanch spinach, puree. Knead into dough with spices.", "Roll out and cook on tawa with ghee."],
    ["Don't add too much spinach puree or dough gets sticky."], (2, 260, "8g", "36g", "8g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Methi Paratha", "Fenugreek leaf flatbread, aromatic and nutritious.",
    "20 min", "Easy",
    [("whole wheat flour", 2, "cups"), ("methi leaves", 1, "cup"), ("ajwain", "1/2", "tsp"), ("green chili", 1, ""), ("ghee", 1, "tbsp")],
    ["Chop methi finely. Knead into dough with spices.", "Roll and cook on tawa with ghee."],
    ["Add a pinch of sugar to reduce bitterness of methi."], (2, 250, "7g", "35g", "8g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Pumpkin Paratha", "Sweet and savory stuffed pumpkin flatbread.",
    "25 min", "Medium",
    [("whole wheat flour", 2, "cups"), ("pumpkin", 1, "cup"), ("cumin", 1, "tsp"), ("red chili powder", "1/2", "tsp"), ("ghee", 1, "tbsp")],
    ["Grate pumpkin, cook until dry. Season with spices.", "Stuff dough with pumpkin mixture, roll and cook with ghee."],
    ["Cook filling until completely dry."], (2, 270, "7g", "38g", "9g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Mix Veg Paratha", "Flatbread stuffed with mixed vegetables and spices.",
    "25 min", "Medium",
    [("whole wheat flour", 2, "cups"), ("carrots", 1, ""), ("beans", 6, ""), ("capsicum", "1/2", ""), ("garam masala", 1, "tsp"), ("ghee", 1, "tbsp")],
    ["Finely chop and sauté vegetables with spices.", "Stuff dough, roll, cook on tawa with ghee."],
    ["Chop veggies very fine for easy stuffing."], (2, 290, "8g", "40g", "9g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Plain Paratha", "Layered whole wheat flatbread cooked with ghee.",
    "15 min", "Easy",
    [("whole wheat flour", 2, "cups"), ("ghee", 2, "tbsp"), ("salt", 1, "tsp"), ("water", "", "as needed")],
    ["Knead soft dough. Roll, apply ghee, fold into layers.", "Roll again, cook on tawa with ghee until golden layers form."],
    ["Fold and roll multiple times for flaky layers."], (2, 240, "6g", "34g", "9g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Thepla", "Gujarati spiced fenugreek flatbread, great for travel.",
    "20 min", "Easy",
    [("whole wheat flour", 2, "cups"), ("methi leaves", 1, "cup"), ("curd", 2, "tbsp"), ("turmeric", "1/2", "tsp"), ("oil", 2, "tbsp")],
    ["Mix flour with chopped methi, curd, turmeric, salt. Knead soft dough.", "Roll thin, cook on tawa with oil until light brown spots appear."],
    ["Stays fresh for days — ideal travel food."], (4, 180, "5g", "26g", "6g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Poori", "Deep-fried puffed whole wheat bread, festive breakfast.",
    "20 min", "Easy",
    [("whole wheat flour", 2, "cups"), ("oil", "", "for frying"), ("salt", 1, "tsp"), ("water", "", "as needed")],
    ["Knead firm dough with flour, salt, a little oil.", "Roll into small circles.", "Deep fry in hot oil until they puff up and turn golden."],
    ["Oil must be very hot for pooris to puff."], (4, 200, "4g", "24g", "10g"),
    "Indian", "south-asian", VEGAN, ["fried"]
))

recipes.append(recipe(
    "Bhatura", "Deep-fried leavened bread, served with chole.",
    "30 min", "Medium",
    [("maida", 2, "cups"), ("curd", "1/4", "cup"), ("baking soda", "1/4", "tsp"), ("sugar", 1, "tsp"), ("oil", "", "for frying")],
    ["Mix flour, curd, baking soda, sugar, salt. Knead soft dough, rest 2 hours.", "Roll into oval shapes.", "Deep fry until puffed and golden."],
    ["Resting the dough is essential for soft bhatura."], (4, 280, "5g", "34g", "13g"),
    "Indian", "south-asian", VEG, ["fried"]
))

recipes.append(recipe(
    "Chole Bhature", "Spiced chickpea curry with deep-fried bread, a Delhi classic.",
    "40 min", "Medium",
    [("chickpeas", 1, "cup"), ("onion", 2, ""), ("tomato", 2, ""), ("ginger-garlic paste", 1, "tbsp"), ("chole masala", 2, "tsp"), ("maida", 2, "cups"), ("oil", "", "for frying")],
    ["Soak and pressure cook chickpeas. Make chole gravy with onion-tomato-spice base.", "Knead bhatura dough, rest, roll and deep fry.", "Serve hot bhatura with chole."],
    ["Soak chickpeas overnight and add tea bags while boiling for dark color."], (2, 450, "15g", "55g", "18g"),
    "Indian", "south-asian", VEG, ["fried"]
))

recipes.append(recipe(
    "Poha", "Spiced flattened rice with mustard seeds, onions, and peanuts.",
    "15 min", "Easy",
    [("flattened rice", 200, "g"), ("onion", 1, ""), ("peanuts", 30, "g"), ("mustard seeds", 1, "tsp"), ("curry leaves", 8, ""), ("turmeric", "1/2", "tsp")],
    ["Rinse poha, drain, let soften 5 min.", "Temper mustard seeds, fry peanuts, add curry leaves and onion.", "Add poha, turmeric, salt. Toss gently, squeeze lemon."],
    ["Don't over-soak or it becomes mushy."], (2, 280, "7g", "42g", "9g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Upma", "Savory semolina porridge tempered with spices and vegetables.",
    "15 min", "Easy",
    [("rava", 1, "cup"), ("onion", 1, ""), ("mustard seeds", 1, "tsp"), ("curry leaves", 8, ""), ("green chili", 1, ""), ("ghee", 1, "tbsp")],
    ["Dry roast rava until fragrant.", "Temper mustard seeds, curry leaves, add onion and chili.", "Add water, salt, bring to boil. Add rava, stir continuously until thick."],
    ["Stir continuously to prevent lumps."], (2, 230, "5g", "36g", "6g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Bread Upma", "Quick breakfast made with bread cubes tempered with spices.",
    "10 min", "Easy",
    [("bread slices", 4, ""), ("onion", 1, ""), ("mustard seeds", 1, "tsp"), ("curry leaves", 6, ""), ("green chili", 1, ""), ("oil", 1, "tbsp")],
    ["Cut bread into cubes.", "Temper mustard seeds, curry leaves. Add onion, chili.", "Add bread cubes, toss with turmeric and salt."],
    ["Use day-old bread for best results."], (2, 200, "5g", "28g", "7g"),
    "Indian", "south-asian", VEGAN
))

recipes.append(recipe(
    "Semiya Upma", "Vermicelli upma, a quick and light South Indian breakfast.",
    "15 min", "Easy",
    [("vermicelli", 1, "cup"), ("onion", 1, ""), ("mustard seeds", 1, "tsp"), ("curry leaves", 6, ""), ("peanuts", 2, "tbsp"), ("ghee", 1, "tbsp")],
    ["Roast vermicelli in ghee until golden.", "Temper mustard seeds, peanuts, curry leaves. Add onion.", "Add water, salt. Add roasted vermicelli, cover and cook 5 min."],
    ["Roast vermicelli well to prevent mushy texture."], (2, 250, "6g", "38g", "7g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Oats Upma", "Healthy upma made with oats instead of semolina.",
    "10 min", "Easy",
    [("rolled oats", 1, "cup"), ("onion", 1, ""), ("mustard seeds", 1, "tsp"), ("curry leaves", 6, ""), ("peas", "1/4", "cup"), ("oil", 1, "tbsp")],
    ["Dry roast oats 2 min.", "Temper mustard seeds, curry leaves, add vegetables.", "Add water, oats, cook 3-4 min until thick."],
    ["Don't over-cook or oats become gummy."], (2, 180, "7g", "26g", "5g"),
    "Indian", "south-asian", VEGAN
))

recipes.append(recipe(
    "Tomato Upma", "Tangy tomato-flavored semolina upma.",
    "15 min", "Easy",
    [("rava", 1, "cup"), ("tomato", 2, ""), ("onion", 1, ""), ("mustard seeds", 1, "tsp"), ("red chili powder", "1/2", "tsp")],
    ["Roast rava. Temper spices, add onion and tomato.", "Add water, salt. Add rava, stir until thick."],
    ["Use ripe red tomatoes for best flavor."], (2, 240, "5g", "38g", "6g"),
    "Indian", "south-asian", VEGAN
))

recipes.append(recipe(
    "Aval Upma", "Upma made with flattened rice (poha) and spices.",
    "10 min", "Easy",
    [("thick poha", 1, "cup"), ("onion", 1, "small"), ("mustard seeds", 1, "tsp"), ("peanuts", 2, "tbsp"), ("curry leaves", 6, "")],
    ["Rinse thick poha, drain.", "Temper spices, add onion and peanuts.", "Add poha, turmeric, salt. Toss and cook 3 min."],
    ["Use thick poha variety for this."], (2, 220, "6g", "34g", "7g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Besan Chilla", "Savory gram flour pancake with onions and spices.",
    "10 min", "Easy",
    [("besan", 1, "cup"), ("onion", 1, "small"), ("green chili", 1, ""), ("cumin seeds", 1, "tsp"), ("coriander", 2, "tbsp"), ("water", "3/4", "cup")],
    ["Mix besan with water, spices, onion to smooth batter.", "Pour on hot tawa, spread thin.", "Cook both sides with a little oil until golden."],
    ["Add finely grated vegetables for extra nutrition."], (2, 190, "10g", "22g", "6g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Moong Dal Chilla", "Protein-rich savory pancake from ground moong lentils.",
    "15 min", "Easy",
    [("moong dal", 1, "cup"), ("ginger", "1/2", "inch"), ("green chili", 1, ""), ("cumin seeds", "1/2", "tsp"), ("salt", "", "to taste")],
    ["Soak moong dal 4 hours. Grind to smooth batter.", "Add ginger, chili, cumin.", "Spread on tawa, cook both sides until golden."],
    ["Soak overnight for easiest grinding."], (2, 180, "12g", "24g", "2g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Masoor Dal Chilla", "Savory red lentil pancakes, quick and protein-packed.",
    "15 min", "Easy",
    [("masoor dal", 1, "cup"), ("onion", 1, "small"), ("cumin", 1, "tsp"), ("coriander", 2, "tbsp"), ("green chili", 1, "")],
    ["Soak masoor dal 2 hours. Grind to batter.", "Mix in diced onion, cumin, coriander.", "Spread on tawa and cook both sides."],
    ["Masoor grinds faster than other dals."], (2, 190, "13g", "26g", "2g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Oats Chilla", "Healthy savory pancake made with oats and besan.",
    "10 min", "Easy",
    [("rolled oats", "1/2", "cup"), ("besan", "1/2", "cup"), ("onion", 1, "small"), ("spinach", "1/4", "cup"), ("green chili", 1, "")],
    ["Blend oats. Mix with besan, water, veggies, spices.", "Spread on tawa, cook both sides."],
    ["Great for kids — hide vegetables in the batter."], (2, 170, "9g", "22g", "4g"),
    "Indian", "south-asian", VEGAN
))

recipes.append(recipe(
    "Egg Bhurji", "Indian scrambled eggs with onions, tomatoes, and spices.",
    "10 min", "Easy",
    [("eggs", 4, ""), ("onion", 1, ""), ("tomato", 1, ""), ("green chili", 1, ""), ("turmeric", "1/4", "tsp"), ("coriander", 2, "tbsp")],
    ["Beat eggs. Sauté onion, tomato, chili with turmeric.", "Add beaten eggs, scramble until cooked.", "Garnish with coriander."],
    ["Don't overcook — keep eggs slightly soft."], (2, 220, "14g", "4g", "16g"),
    "Indian", "south-asian", ["gluten-free", "dairy-free"]
))

recipes.append(recipe(
    "Sabudana Khichdi", "Fluffy sago pearls with peanuts and potato, a fasting breakfast.",
    "20 min", "Easy",
    [("sabudana", 1, "cup"), ("peanuts", "1/4", "cup"), ("potato", 1, "medium"), ("cumin seeds", 1, "tsp"), ("green chili", 1, ""), ("ghee", 1, "tbsp")],
    ["Soak sabudana 4-6 hours. Drain well.", "Roast and crush peanuts. Cube and fry potato.", "Temper cumin, add sabudana, peanuts, potato. Toss gently."],
    ["Sabudana must be soaked properly — each pearl should be separate."], (2, 300, "7g", "45g", "10g"),
    "Indian", "south-asian", VEG_GF
))

recipes.append(recipe(
    "Dalia", "Broken wheat porridge cooked with vegetables and mild spices.",
    "20 min", "Easy",
    [("dalia", 1, "cup"), ("onion", 1, ""), ("tomato", 1, ""), ("peas", "1/4", "cup"), ("cumin seeds", 1, "tsp"), ("ghee", 1, "tbsp")],
    ["Dry roast dalia until nutty.", "Temper cumin, sauté onion, tomato, peas.", "Add water, dalia, cook until soft and fluffy."],
    ["Roasting dalia enhances flavor and keeps grains separate."], (2, 240, "8g", "40g", "5g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Savory Masala French Toast", "Indian-spiced French toast with chili and coriander.",
    "15 min", "Easy",
    [("bread", 4, "slices"), ("eggs", 2, ""), ("green chili", 1, ""), ("onion", 1, "small"), ("coriander", 2, "tbsp"), ("salt", "", "to taste")],
    ["Beat eggs with finely chopped chili, onion, coriander, salt.", "Dip bread slices in egg mixture.", "Pan fry on both sides until golden."],
    ["Use thick bread for better absorption."], (2, 260, "12g", "26g", "12g"),
    "Indian", "south-asian", []
))

recipes.append(recipe(
    "Bread Pakora", "Bread slices dipped in spiced gram flour batter and deep fried.",
    "15 min", "Easy",
    [("bread", 4, "slices"), ("besan", 1, "cup"), ("potatoes", 2, "medium"), ("green chili", 2, ""), ("oil", "", "for frying")],
    ["Make potato stuffing with spices. Sandwich between bread slices.", "Make besan batter. Dip sandwiches in batter.", "Deep fry until golden and crispy."],
    ["Squeeze bread slightly before dipping so it doesn't absorb too much oil."], (2, 320, "8g", "35g", "16g"),
    "Indian", "south-asian", VEG, ["fried"]
))

recipes.append(recipe(
    "Bombay Sandwich", "Layered vegetable sandwich with chutneys, a Mumbai street classic.",
    "10 min", "Easy",
    [("bread", 4, "slices"), ("potato", 1, "boiled"), ("cucumber", "1/2", ""), ("tomato", 1, ""), ("green chutney", 2, "tbsp"), ("butter", 1, "tbsp")],
    ["Spread chutney on bread. Layer sliced veggies and potato.", "Press together, toast on tawa with butter.", "Cut diagonally and serve."],
    ["Use thick-sliced bread for sturdier sandwich."], (2, 280, "7g", "38g", "10g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Kolkata Egg Roll", "Egg-wrapped paratha roll with onions and chutney, street food style.",
    "15 min", "Easy",
    [("paratha", 2, ""), ("eggs", 2, ""), ("onion", 1, "sliced"), ("green chutney", 2, "tbsp"), ("lemon juice", 1, "tbsp")],
    ["Cook paratha on tawa. Pour beaten egg on top, flip to set.", "Add sliced onion, chutney, lemon juice.", "Roll up tightly and serve."],
    ["Use a hot tawa so egg sets quickly."], (2, 350, "14g", "36g", "16g"),
    "Indian", "south-asian", []
))

recipes.append(recipe(
    "Handvo", "Gujarati savory rice and lentil cake with vegetables.",
    "40 min", "Medium",
    [("rice", 1, "cup"), ("chana dal", "1/4", "cup"), ("toor dal", "1/4", "cup"), ("bottle gourd", 1, "cup"), ("ginger-green chili paste", 1, "tbsp"), ("sesame seeds", 1, "tsp")],
    ["Soak rice and dals, grind to batter, ferment overnight.", "Add grated bottle gourd, spices, baking soda.", "Pour in greased pan, top with sesame seeds. Bake or cook on stovetop."],
    ["Can be baked in oven at 375°F for 30 min."], (4, 200, "8g", "32g", "4g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Dhokla", "Steamed fermented gram flour cake, light and spongy Gujarati snack.",
    "25 min", "Medium",
    [("besan", 1, "cup"), ("curd", "1/2", "cup"), ("turmeric", "1/2", "tsp"), ("ENO", 1, "tsp"), ("mustard seeds", 1, "tsp"), ("curry leaves", 8, "")],
    ["Mix besan, curd, turmeric, water to smooth batter.", "Add ENO, mix gently, pour into greased plate, steam 12 min.", "Temper mustard seeds and curry leaves, pour over dhokla."],
    ["Add ENO just before steaming."], (4, 140, "8g", "18g", "3g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Masala Chai", "Indian spiced milk tea with ginger and cardamom.",
    "10 min", "Easy",
    [("tea leaves", 2, "tsp"), ("milk", 1, "cup"), ("ginger", "1/2", "inch"), ("cardamom", 2, "pods"), ("sugar", 2, "tsp"), ("water", 1, "cup")],
    ["Boil water with crushed ginger and cardamom.", "Add tea leaves, simmer 2 min.", "Add milk and sugar, bring to boil twice, strain and serve."],
    ["Crush cardamom and ginger for maximum flavor."], (2, 80, "2g", "12g", "2g"),
    "Indian", "south-asian", VEG_GF
))

# ===================== INTERNATIONAL — OATMEAL & PORRIDGE =====================

recipes.append(recipe(
    "Overnight Oats", "No-cook oats soaked in milk overnight with fruits and nuts.",
    "5 min + overnight", "Easy",
    [("rolled oats", "1/2", "cup"), ("milk", "1/2", "cup"), ("yogurt", "1/4", "cup"), ("chia seeds", 1, "tbsp"), ("honey", 1, "tbsp"), ("berries", "1/4", "cup")],
    ["Mix oats, milk, yogurt, chia seeds, honey in a jar.", "Top with berries.", "Refrigerate overnight, eat cold in the morning."],
    ["Prepare 2-3 jars at once for easy weekday breakfasts."], (1, 300, "10g", "42g", "9g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Baked Oatmeal", "Warm oven-baked oatmeal with banana and cinnamon, feeds a crowd.",
    "35 min", "Easy",
    [("rolled oats", 2, "cups"), ("banana", 2, ""), ("eggs", 1, ""), ("milk", "1.5", "cups"), ("maple syrup", 3, "tbsp"), ("cinnamon", 1, "tsp"), ("baking powder", 1, "tsp")],
    ["Mash bananas. Mix all ingredients.", "Pour into greased baking dish.", "Bake at 375°F for 30 min until set and golden."],
    ["Make ahead — reheat portions through the week."], (4, 280, "9g", "44g", "7g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Classic Oatmeal", "Simple stovetop oatmeal with honey and banana.",
    "10 min", "Easy",
    [("rolled oats", "1/2", "cup"), ("water or milk", 1, "cup"), ("banana", "1/2", ""), ("honey", 1, "tbsp"), ("cinnamon", "1/4", "tsp")],
    ["Bring liquid to boil, add oats.", "Cook 5 min stirring occasionally.", "Top with sliced banana, honey, cinnamon."],
    ["Use steel-cut oats for chewier texture (cook longer)."], (1, 250, "7g", "42g", "5g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Savory Oatmeal", "Oatmeal topped with a fried egg, cheese, and herbs — savory twist.",
    "10 min", "Easy",
    [("rolled oats", "1/2", "cup"), ("water", 1, "cup"), ("egg", 1, ""), ("cheese", 1, "tbsp"), ("salt", "", "to taste"), ("black pepper", "", "to taste")],
    ["Cook oats in water with salt.", "Fry an egg separately.", "Top oatmeal with egg, cheese, pepper, herbs."],
    ["Add sautéed spinach for extra nutrition."], (1, 300, "14g", "34g", "12g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Homemade Granola", "Crunchy oven-baked oat clusters with nuts and honey.",
    "35 min", "Easy",
    [("rolled oats", 3, "cups"), ("almonds", "1/2", "cup"), ("coconut oil", "1/4", "cup"), ("honey", "1/4", "cup"), ("vanilla", 1, "tsp"), ("cinnamon", 1, "tsp")],
    ["Mix oats, nuts, melted coconut oil, honey, vanilla, cinnamon.", "Spread on baking sheet, press flat.", "Bake at 325°F for 25 min, stir once. Cool completely for clusters."],
    ["Don't stir after baking for big crunchy clusters."], (6, 280, "7g", "34g", "14g"),
    "International", "global", VEGAN_GF
))

recipes.append(recipe(
    "Cinnamon Quinoa Breakfast Bowl", "Warm quinoa cooked like oatmeal with cinnamon and fruit.",
    "20 min", "Easy",
    [("quinoa", "1/2", "cup"), ("milk", 1, "cup"), ("cinnamon", "1/2", "tsp"), ("maple syrup", 1, "tbsp"), ("berries", "1/4", "cup"), ("almonds", 1, "tbsp")],
    ["Cook quinoa in milk with cinnamon.", "Sweeten with maple syrup.", "Top with berries and sliced almonds."],
    ["Rinse quinoa well to remove bitterness."], (1, 320, "12g", "46g", "10g"),
    "International", "global", VEGAN_GF
))

recipes.append(recipe(
    "Chia Seed Pudding", "Creamy chia pudding soaked in milk overnight with vanilla.",
    "5 min + 4hr", "Easy",
    [("chia seeds", 3, "tbsp"), ("milk", 1, "cup"), ("vanilla extract", "1/2", "tsp"), ("honey", 1, "tbsp"), ("mango", "1/4", "cup")],
    ["Mix chia seeds, milk, vanilla, honey.", "Stir well, refrigerate 4 hours or overnight.", "Top with fresh fruit before serving."],
    ["Stir after 10 min to prevent clumping."], (1, 250, "8g", "30g", "12g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Mango Chia Pudding", "Tropical chia pudding layered with fresh mango puree.",
    "5 min + 4hr", "Easy",
    [("chia seeds", 3, "tbsp"), ("coconut milk", 1, "cup"), ("mango", 1, ""), ("honey", 1, "tbsp")],
    ["Mix chia seeds with coconut milk and honey.", "Refrigerate 4 hours.", "Blend mango, layer with chia pudding."],
    ["Use ripe Alphonso mango for best sweetness."], (1, 280, "6g", "34g", "14g"),
    "International", "global", VEGAN_GF
))

# ===================== INTERNATIONAL — EGGS =====================

recipes.append(recipe(
    "Classic Omelette", "Fluffy folded omelette with cheese and herbs.",
    "10 min", "Easy",
    [("eggs", 3, ""), ("cheese", 2, "tbsp"), ("butter", 1, "tbsp"), ("salt", "", "to taste"), ("black pepper", "", "to taste"), ("herbs", 1, "tbsp")],
    ["Beat eggs with salt and pepper.", "Melt butter in pan, pour eggs.", "When nearly set, add cheese and herbs, fold in half."],
    ["Use medium-low heat for fluffy omelette."], (1, 300, "20g", "2g", "23g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Scrambled Eggs", "Soft creamy scrambled eggs, a breakfast essential.",
    "5 min", "Easy",
    [("eggs", 3, ""), ("butter", 1, "tbsp"), ("milk", 1, "tbsp"), ("salt", "", "to taste"), ("black pepper", "", "to taste")],
    ["Beat eggs with milk, salt, pepper.", "Melt butter on low heat, add eggs.", "Stir gently with spatula, remove when just set."],
    ["Low heat and gentle stirring = creamiest scramble."], (1, 250, "18g", "1g", "19g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Shakshuka", "Eggs poached in spiced tomato-pepper sauce, a Middle Eastern classic.",
    "25 min", "Easy",
    [("eggs", 4, ""), ("tomatoes", 4, ""), ("bell pepper", 1, ""), ("onion", 1, ""), ("cumin", 1, "tsp"), ("paprika", 1, "tsp"), ("olive oil", 2, "tbsp")],
    ["Sauté onion and pepper in olive oil. Add spices.", "Add crushed tomatoes, simmer 10 min.", "Make wells, crack eggs in, cover and cook until set."],
    ["Serve with crusty bread for dipping."], (2, 260, "14g", "16g", "16g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Frittata", "Italian open-faced omelette baked with vegetables and cheese.",
    "25 min", "Easy",
    [("eggs", 6, ""), ("spinach", 1, "cup"), ("bell pepper", 1, ""), ("onion", 1, "small"), ("cheese", "1/4", "cup"), ("olive oil", 1, "tbsp")],
    ["Sauté vegetables in oven-safe pan.", "Pour beaten eggs over, top with cheese.", "Cook on stove 3 min, then broil 5 min until puffed and golden."],
    ["Great for using up leftover vegetables."], (4, 200, "14g", "4g", "14g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Egg Muffins", "Mini egg cups baked with vegetables, perfect for meal prep.",
    "25 min", "Easy",
    [("eggs", 6, ""), ("spinach", 1, "cup"), ("bell pepper", "1/2", ""), ("cheese", "1/4", "cup"), ("salt", "", "to taste")],
    ["Beat eggs, mix in chopped vegetables and cheese.", "Pour into greased muffin tin.", "Bake at 375°F for 18-20 min."],
    ["Freeze for up to 1 month — reheat in microwave."], (6, 120, "10g", "2g", "8g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Crustless Quiche", "Light egg and vegetable quiche without the pastry crust.",
    "35 min", "Easy",
    [("eggs", 6, ""), ("milk", "1/2", "cup"), ("spinach", 1, "cup"), ("mushrooms", 1, "cup"), ("cheese", "1/2", "cup"), ("onion", 1, "small")],
    ["Sauté vegetables. Beat eggs with milk.", "Layer veggies and cheese in baking dish. Pour egg mixture.", "Bake at 375°F for 25-30 min until set."],
    ["Let rest 5 min before cutting."], (4, 180, "14g", "4g", "12g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Egg Toast", "Simple fried or scrambled egg on buttered toast.",
    "5 min", "Easy",
    [("bread", 2, "slices"), ("eggs", 2, ""), ("butter", 1, "tbsp"), ("salt", "", "to taste"), ("pepper", "", "to taste")],
    ["Toast bread. Fry or scramble eggs with butter.", "Place eggs on toast, season."],
    ["Runny yolk on toast is chef's kiss."], (1, 300, "14g", "24g", "16g"),
    "International", "global", []
))

# ===================== INTERNATIONAL — SMOOTHIES =====================

recipes.append(recipe(
    "Strawberry Banana Smoothie", "Classic fruit smoothie, naturally sweet and creamy.",
    "5 min", "Easy",
    [("strawberries", 1, "cup"), ("banana", 1, ""), ("yogurt", "1/2", "cup"), ("milk", "1/2", "cup"), ("honey", 1, "tsp")],
    ["Add all ingredients to blender.", "Blend until smooth.", "Pour and serve immediately."],
    ["Use frozen fruit for thicker smoothie."], (1, 220, "7g", "42g", "3g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Avocado Smoothie", "Creamy avocado smoothie with banana and spinach.",
    "5 min", "Easy",
    [("avocado", "1/2", ""), ("banana", 1, ""), ("spinach", 1, "cup"), ("milk", 1, "cup"), ("honey", 1, "tsp")],
    ["Blend all ingredients until creamy.", "Adjust thickness with more milk if needed."],
    ["Avocado makes it incredibly creamy."], (1, 280, "6g", "36g", "14g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Peanut Butter Banana Smoothie", "Protein-rich smoothie with peanut butter and banana.",
    "5 min", "Easy",
    [("banana", 1, ""), ("peanut butter", 2, "tbsp"), ("milk", 1, "cup"), ("honey", 1, "tsp"), ("oats", 2, "tbsp")],
    ["Blend all ingredients until smooth."],
    ["Add a scoop of protein powder for post-workout breakfast."], (1, 380, "14g", "48g", "16g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Green Smoothie", "Nutrient-packed smoothie with spinach, banana, and fruits.",
    "5 min", "Easy",
    [("spinach", 2, "cups"), ("banana", 1, ""), ("apple", "1/2", ""), ("ginger", "1/2", "inch"), ("water", 1, "cup")],
    ["Blend spinach and water first until smooth.", "Add remaining fruits and ginger, blend again."],
    ["Spinach flavor is undetectable once blended."], (1, 160, "3g", "36g", "1g"),
    "International", "global", VEGAN_GF
))

recipes.append(recipe(
    "Mango Smoothie", "Tropical mango smoothie with yogurt, perfect summer breakfast.",
    "5 min", "Easy",
    [("mango", 1, "cup"), ("yogurt", "1/2", "cup"), ("milk", "1/2", "cup"), ("honey", 1, "tsp")],
    ["Blend mango, yogurt, milk, honey until smooth."],
    ["Use frozen mango for thicker texture."], (1, 220, "6g", "42g", "3g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Blueberry Smoothie", "Antioxidant-rich blueberry smoothie with banana.",
    "5 min", "Easy",
    [("blueberries", 1, "cup"), ("banana", 1, ""), ("yogurt", "1/2", "cup"), ("milk", "1/2", "cup")],
    ["Blend all ingredients until smooth."],
    ["Frozen blueberries work just as well."], (1, 200, "6g", "38g", "3g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Coffee Smoothie", "Energizing breakfast smoothie with coffee and banana.",
    "5 min", "Easy",
    [("cold coffee", 1, "cup"), ("banana", 1, ""), ("milk", "1/2", "cup"), ("cocoa powder", 1, "tsp"), ("honey", 1, "tsp")],
    ["Blend all ingredients until smooth and frothy."],
    ["Freeze coffee in ice cube trays for thicker smoothie."], (1, 200, "5g", "38g", "3g"),
    "International", "global", VEG_GF
))

# ===================== INTERNATIONAL — PANCAKES & WAFFLES =====================

recipes.append(recipe(
    "Classic Pancakes", "Fluffy American-style pancakes with maple syrup.",
    "15 min", "Easy",
    [("flour", "1.5", "cups"), ("milk", "1.25", "cups"), ("egg", 1, ""), ("butter", 2, "tbsp"), ("baking powder", 2, "tsp"), ("sugar", 2, "tbsp")],
    ["Mix dry ingredients. Whisk wet ingredients separately.", "Combine, don't overmix (lumps are fine).", "Cook on griddle until bubbles form, flip, cook until golden."],
    ["Don't press down on pancakes while cooking."], (4, 250, "6g", "36g", "8g"),
    "International", "global", VEG
))

recipes.append(recipe(
    "Banana Pancakes", "Naturally sweet pancakes made with mashed banana.",
    "15 min", "Easy",
    [("banana", 2, "ripe"), ("eggs", 2, ""), ("oats", "1/2", "cup"), ("cinnamon", "1/2", "tsp"), ("baking powder", "1/2", "tsp")],
    ["Mash bananas. Mix with eggs, oats, cinnamon, baking powder.", "Cook small pancakes on medium heat.", "Flip when bubbles form."],
    ["Riper bananas = sweeter pancakes."], (2, 200, "8g", "30g", "6g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Blueberry Pancakes", "Fluffy pancakes studded with fresh blueberries.",
    "15 min", "Easy",
    [("flour", "1.5", "cups"), ("milk", 1, "cup"), ("egg", 1, ""), ("blueberries", "1/2", "cup"), ("baking powder", 2, "tsp"), ("sugar", 2, "tbsp")],
    ["Mix dry ingredients. Add wet, fold in blueberries.", "Cook on griddle, flip when bubbles form."],
    ["Don't smash blueberries — fold gently."], (4, 230, "6g", "38g", "5g"),
    "International", "global", VEG
))

recipes.append(recipe(
    "Oatmeal Pancakes", "Hearty whole grain pancakes made with oats.",
    "15 min", "Easy",
    [("rolled oats", 1, "cup"), ("milk", "3/4", "cup"), ("egg", 1, ""), ("banana", 1, ""), ("cinnamon", "1/2", "tsp"), ("baking powder", 1, "tsp")],
    ["Blend oats into flour. Mix with remaining ingredients.", "Cook on medium heat, flip when set."],
    ["Blend oats fine for smooth pancakes, coarse for rustic."], (2, 220, "9g", "34g", "6g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "French Toast", "Bread slices soaked in egg-milk mixture, pan-fried golden.",
    "15 min", "Easy",
    [("bread", 4, "slices"), ("eggs", 2, ""), ("milk", "1/4", "cup"), ("cinnamon", "1/2", "tsp"), ("vanilla", "1/2", "tsp"), ("butter", 1, "tbsp")],
    ["Beat eggs with milk, cinnamon, vanilla.", "Dip bread slices to coat evenly.", "Cook in butter until golden on both sides."],
    ["Use thick bread like brioche for best results."], (2, 300, "12g", "32g", "14g"),
    "International", "global", VEG
))

recipes.append(recipe(
    "Homemade Waffles", "Crispy on the outside, fluffy inside — classic waffles.",
    "20 min", "Easy",
    [("flour", 2, "cups"), ("milk", "1.75", "cups"), ("eggs", 2, ""), ("butter", "1/3", "cup"), ("baking powder", 1, "tbsp"), ("sugar", 2, "tbsp")],
    ["Mix dry ingredients. Whisk wet ingredients.", "Combine gently. Pour into preheated waffle iron.", "Cook until steam stops and waffle is golden."],
    ["Separate eggs, whip whites for extra fluffy waffles."], (4, 280, "8g", "36g", "12g"),
    "International", "global", VEG
))

# ===================== INTERNATIONAL — BREADS & TOAST =====================

recipes.append(recipe(
    "Avocado Toast", "Smashed avocado on toast with lemon, chili flakes, and salt.",
    "5 min", "Easy",
    [("bread", 2, "slices"), ("avocado", 1, "ripe"), ("lemon juice", 1, "tsp"), ("chili flakes", "1/4", "tsp"), ("salt", "", "to taste")],
    ["Toast bread. Mash avocado with lemon, salt, chili.", "Spread on toast."],
    ["Top with a poached egg for extra protein."], (1, 300, "6g", "30g", "18g"),
    "International", "global", VEGAN
))

recipes.append(recipe(
    "Breakfast Sandwich", "Egg and cheese sandwich on toasted bread.",
    "10 min", "Easy",
    [("bread", 2, "slices"), ("egg", 1, ""), ("cheese", 1, "slice"), ("butter", 1, "tsp"), ("spinach", "handful", "")],
    ["Toast bread. Fry egg.", "Layer egg, cheese, spinach on toast."],
    ["Add avocado or tomato for extra flavor."], (1, 320, "16g", "26g", "16g"),
    "International", "global", VEG
))

recipes.append(recipe(
    "Healthy Banana Bread", "Moist banana bread made with whole wheat and less sugar.",
    "50 min", "Easy",
    [("ripe bananas", 3, ""), ("whole wheat flour", "1.5", "cups"), ("eggs", 2, ""), ("honey", "1/4", "cup"), ("coconut oil", "1/4", "cup"), ("baking soda", 1, "tsp")],
    ["Mash bananas. Mix wet ingredients.", "Fold in dry ingredients.", "Bake at 350°F for 45 min."],
    ["Use very ripe (spotty) bananas for best sweetness."], (8, 200, "4g", "32g", "7g"),
    "International", "global", VEG
))

recipes.append(recipe(
    "Zucchini Bread", "Moist quick bread with grated zucchini and warm spices.",
    "55 min", "Easy",
    [("zucchini", 1, "large"), ("flour", 2, "cups"), ("eggs", 2, ""), ("sugar", "1/2", "cup"), ("oil", "1/3", "cup"), ("cinnamon", 1, "tsp")],
    ["Grate zucchini, squeeze water.", "Mix wet and dry ingredients separately, combine.", "Bake at 350°F for 50 min."],
    ["Don't skip squeezing the zucchini moisture."], (8, 210, "4g", "30g", "9g"),
    "International", "global", VEG
))

# ===================== INTERNATIONAL — MUFFINS & BARS =====================

recipes.append(recipe(
    "Blueberry Muffins", "Classic fluffy muffins bursting with blueberries.",
    "30 min", "Easy",
    [("flour", 2, "cups"), ("blueberries", 1, "cup"), ("sugar", "1/2", "cup"), ("butter", "1/3", "cup"), ("egg", 1, ""), ("milk", "3/4", "cup"), ("baking powder", 2, "tsp")],
    ["Mix dry ingredients. Combine wet ingredients.", "Fold together, add blueberries.", "Fill muffin cups 2/3 full, bake 375°F for 22 min."],
    ["Toss blueberries in flour to prevent sinking."], (12, 180, "3g", "28g", "6g"),
    "International", "global", VEG, ["high-sugar"]
))

recipes.append(recipe(
    "Healthy Banana Muffins", "Naturally sweetened banana muffins with oats.",
    "25 min", "Easy",
    [("ripe bananas", 2, ""), ("oats", "1.5", "cups"), ("egg", 1, ""), ("honey", 2, "tbsp"), ("baking powder", 1, "tsp"), ("cinnamon", 1, "tsp")],
    ["Blend oats into flour. Mash bananas.", "Mix all ingredients. Spoon into muffin tin.", "Bake 350°F for 18-20 min."],
    ["These are lower sugar — sweetened by banana and a little honey."], (8, 130, "4g", "22g", "2g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Apple Muffins", "Warm spiced apple muffins with cinnamon.",
    "30 min", "Easy",
    [("flour", 2, "cups"), ("apple", 1, "large"), ("sugar", "1/3", "cup"), ("butter", "1/4", "cup"), ("egg", 1, ""), ("milk", "3/4", "cup"), ("cinnamon", 1, "tsp")],
    ["Dice apple. Mix dry ingredients.", "Combine wet, fold in apples.", "Bake 375°F for 22 min."],
    ["Granny Smith apples hold up best in baking."], (12, 170, "3g", "26g", "6g"),
    "International", "global", VEG
))

recipes.append(recipe(
    "Granola Bars", "Chewy homemade granola bars with oats, honey, and nuts.",
    "30 min", "Easy",
    [("rolled oats", 2, "cups"), ("honey", "1/3", "cup"), ("peanut butter", "1/4", "cup"), ("almonds", "1/4", "cup"), ("dried cranberries", "1/4", "cup"), ("vanilla", 1, "tsp")],
    ["Heat honey and peanut butter until smooth.", "Mix with oats, nuts, cranberries.", "Press into pan, bake 325°F for 20 min. Cool and cut."],
    ["Press firmly for bars that hold together."], (8, 200, "5g", "30g", "8g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Energy Balls", "No-bake protein bites with oats, peanut butter, and chocolate.",
    "10 min", "Easy",
    [("rolled oats", 1, "cup"), ("peanut butter", "1/2", "cup"), ("honey", "1/4", "cup"), ("chocolate chips", "1/4", "cup"), ("flaxseed", 2, "tbsp")],
    ["Mix all ingredients.", "Roll into balls.", "Refrigerate 30 min before serving."],
    ["Make a big batch — keeps in fridge for a week."], (12, 100, "3g", "12g", "5g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Blueberry Scones", "Buttery tender scones with blueberries.",
    "30 min", "Easy",
    [("flour", 2, "cups"), ("cold butter", "1/3", "cup"), ("blueberries", "3/4", "cup"), ("sugar", "1/4", "cup"), ("cream", "1/2", "cup"), ("baking powder", 1, "tbsp")],
    ["Cut butter into flour. Add sugar, baking powder.", "Fold in blueberries, add cream until dough forms.", "Shape, cut into wedges, bake 400°F for 15 min."],
    ["Cold butter is essential for flaky scones."], (8, 220, "4g", "30g", "9g"),
    "International", "global", VEG
))

# ===================== INTERNATIONAL — OTHER =====================

recipes.append(recipe(
    "Sweet Potato Hash", "Crispy cubed sweet potatoes with peppers and onions.",
    "20 min", "Easy",
    [("sweet potato", 2, "medium"), ("bell pepper", 1, ""), ("onion", 1, "small"), ("olive oil", 2, "tbsp"), ("paprika", 1, "tsp"), ("salt", "", "to taste")],
    ["Cube sweet potatoes small.", "Cook in oil on medium-high until crispy, 12-15 min.", "Add peppers and onion, cook 5 more min. Season."],
    ["Don't overcrowd the pan for crispiest hash."], (2, 220, "3g", "34g", "8g"),
    "International", "global", VEGAN_GF
))

recipes.append(recipe(
    "Breakfast Tacos", "Soft tortillas filled with scrambled eggs and salsa.",
    "10 min", "Easy",
    [("tortillas", 4, ""), ("eggs", 4, ""), ("cheese", "1/4", "cup"), ("salsa", "1/4", "cup"), ("avocado", "1/2", ""), ("black beans", "1/4", "cup")],
    ["Scramble eggs. Warm tortillas.", "Fill with eggs, beans, cheese, avocado, salsa."],
    ["Corn tortillas for gluten-free option."], (2, 350, "18g", "30g", "18g"),
    "International", "global", VEG
))

recipes.append(recipe(
    "Breakfast Burrito", "Rolled flour tortilla filled with eggs, beans, and cheese.",
    "15 min", "Easy",
    [("flour tortilla", 2, "large"), ("eggs", 4, ""), ("black beans", "1/2", "cup"), ("cheese", "1/4", "cup"), ("salsa", "1/4", "cup"), ("sour cream", 2, "tbsp")],
    ["Scramble eggs. Warm tortilla.", "Layer beans, eggs, cheese, salsa, sour cream.", "Roll up tightly."],
    ["Wrap in foil for on-the-go breakfast."], (2, 400, "22g", "36g", "20g"),
    "International", "global", VEG
))

recipes.append(recipe(
    "Farmers Market Breakfast Bowl", "Grain bowl with roasted vegetables, greens, and egg.",
    "25 min", "Easy",
    [("quinoa or rice", "1/2", "cup"), ("egg", 1, ""), ("sweet potato", 1, "small"), ("kale", 1, "cup"), ("avocado", "1/4", ""), ("olive oil", 1, "tbsp")],
    ["Cook grain. Roast cubed sweet potato 20 min.", "Sauté kale. Fry egg.", "Assemble bowl with all components."],
    ["Prep grains and roast veggies ahead for quick assembly."], (1, 380, "14g", "46g", "16g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Yogurt Bowl", "Creamy yogurt topped with granola, fruits, and honey.",
    "5 min", "Easy",
    [("greek yogurt", 1, "cup"), ("granola", "1/4", "cup"), ("berries", "1/4", "cup"), ("banana", "1/2", ""), ("honey", 1, "tsp")],
    ["Spoon yogurt into bowl.", "Top with granola, sliced fruit, drizzle honey."],
    ["Layer for best texture — eat immediately so granola stays crunchy."], (1, 280, "15g", "40g", "7g"),
    "International", "global", VEG_GF
))

recipes.append(recipe(
    "Fruit Salad", "Fresh seasonal fruit salad with a squeeze of lime and mint.",
    "10 min", "Easy",
    [("apple", 1, ""), ("banana", 1, ""), ("orange", 1, ""), ("grapes", "1/2", "cup"), ("pomegranate", "1/4", "cup"), ("lime juice", 1, "tbsp")],
    ["Chop all fruits into bite-sized pieces.", "Toss with lime juice.", "Garnish with mint leaves."],
    ["Use seasonal fruits for best flavor and price."], (2, 120, "2g", "30g", "0.5g"),
    "International", "global", VEGAN_GF
))

# ===================== ADDITIONAL INDIAN (from sites) =====================

recipes.append(recipe(
    "Kale Potato Paratha", "Nutritious stuffed paratha with kale and potato filling.",
    "25 min", "Medium",
    [("whole wheat flour", 2, "cups"), ("kale", 1, "cup"), ("potato", 2, ""), ("cumin", 1, "tsp"), ("ghee", 1, "tbsp")],
    ["Blanch and chop kale. Mash boiled potatoes, mix with kale and spices.", "Stuff dough, roll, cook on tawa with ghee."],
    ["Blanching kale removes bitterness."], (2, 290, "8g", "40g", "10g"),
    "Indian", "south-asian", VEG
))

recipes.append(recipe(
    "Thalipeeth", "Maharashtrian multi-grain savory flatbread.",
    "15 min", "Easy",
    [("thalipeeth bhajani", 1, "cup"), ("onion", 1, "small"), ("coriander", 2, "tbsp"), ("cumin seeds", 1, "tsp"), ("oil", 1, "tbsp")],
    ["Mix flour with chopped onion, coriander, cumin, water.", "Pat directly on tawa into thick round.", "Make a hole in center, add oil. Cook both sides."],
    ["Use multi-grain flour mix for authentic taste."], (2, 200, "6g", "30g", "6g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Kothu Parotta", "Shredded flaky parotta tossed with eggs and spices, South Indian street food.",
    "15 min", "Easy",
    [("parotta", 2, ""), ("eggs", 2, ""), ("onion", 1, ""), ("green chili", 2, ""), ("soy sauce", 1, "tsp"), ("curry leaves", 6, "")],
    ["Shred parotta into small pieces.", "Scramble eggs separately. Sauté onion, chili, curry leaves.", "Add shredded parotta, eggs, soy sauce. Toss on high heat."],
    ["Use leftover parotta for best results."], (2, 350, "14g", "36g", "16g"),
    "Indian", "south-asian", []
))

recipes.append(recipe(
    "Sheera", "Sweet semolina dessert with ghee, nuts, and saffron — same as Rava Kesari.",
    "15 min", "Easy",
    [("rava", 1, "cup"), ("ghee", 3, "tbsp"), ("sugar", "1/2", "cup"), ("milk", "1.5", "cups"), ("cardamom", 2, ""), ("cashews", 8, "")],
    ["Roast rava in ghee. Add hot milk carefully.", "Cook until thick, add sugar, cardamom.", "Garnish with fried cashews."],
    ["Ghee and sugar make this rich — best as occasional treat."], (4, 300, "4g", "42g", "13g"),
    "Indian", "south-asian", VEG, ["high-sugar"]
))

recipes.append(recipe(
    "Appe", "Round savory dumplings cooked in a special pan, like mini uttapam.",
    "15 min", "Easy",
    [("dosa batter", 2, "cups"), ("onion", 1, "small"), ("carrot", 1, "small"), ("curry leaves", 6, ""), ("oil", 2, "tbsp")],
    ["Mix finely diced veggies into dosa batter.", "Heat appe pan, add oil in each cavity.", "Pour batter, cook on low heat, turn for even cooking."],
    ["Use a well-seasoned appe pan for non-stick results."], (4, 140, "4g", "22g", "4g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Ragi Roti", "Nutritious finger millet flatbread, high in calcium.",
    "15 min", "Easy",
    [("ragi flour", 1, "cup"), ("onion", 1, "small"), ("cumin seeds", 1, "tsp"), ("coriander", 2, "tbsp"), ("salt", "", "to taste")],
    ["Mix flour with diced onion, cumin, coriander, water.", "Pat into rounds on tawa.", "Cook both sides until done."],
    ["Press directly on tawa — ragi dough doesn't roll well."], (2, 170, "4g", "32g", "2g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Dudhi Muthiya", "Steamed bottle gourd dumplings from Gujarat.",
    "25 min", "Easy",
    [("bottle gourd", 1, "cup"), ("whole wheat flour", 1, "cup"), ("besan", "1/4", "cup"), ("ginger-green chili paste", 1, "tsp"), ("sesame seeds", 1, "tsp")],
    ["Grate bottle gourd, mix with flours, spices.", "Shape into logs, steam 15 min.", "Slice and temper with mustard seeds and sesame."],
    ["Squeeze excess water from gourd."], (4, 150, "5g", "24g", "3g"),
    "Indian", "south-asian", VEGAN
))

recipes.append(recipe(
    "Kothimbir Vadi", "Crispy coriander fritters from Maharashtra.",
    "25 min", "Medium",
    [("fresh coriander", 2, "cups"), ("besan", 1, "cup"), ("rice flour", "1/4", "cup"), ("sesame seeds", 1, "tsp"), ("green chili", 2, ""), ("oil", 2, "tbsp")],
    ["Mix chopped coriander with flours, spices, water to thick batter.", "Steam 15 min, cool, cut into squares.", "Shallow fry until crispy."],
    ["Steam first then fry for best texture."], (4, 160, "6g", "20g", "6g"),
    "Indian", "south-asian", VEGAN_GF
))

recipes.append(recipe(
    "Cheese Dosa", "Crispy dosa topped with grated cheese, a kids' favorite.",
    "15 min", "Easy",
    [("dosa batter", 2, "cups"), ("cheese", "1/2", "cup"), ("oil", 1, "tbsp")],
    ["Spread dosa batter thin on hot tawa.", "Sprinkle grated cheese on top.", "Cook until crispy and cheese melts. Fold and serve."],
    ["Use a blend of mozzarella and cheddar."], (2, 280, "10g", "36g", "10g"),
    "Indian", "south-asian", VEG_GF
))

recipes.append(recipe(
    "Oats Egg Omelette", "Quick protein-rich omelette with oats mixed in.",
    "10 min", "Easy",
    [("eggs", 2, ""), ("oats", 2, "tbsp"), ("onion", 1, "small"), ("green chili", 1, ""), ("coriander", 1, "tbsp")],
    ["Beat eggs with oats, chopped onion, chili.", "Pour on heated pan, cook until set.", "Flip and cook other side."],
    ["Oats add fiber without changing taste much."], (1, 220, "14g", "12g", "12g"),
    "Indian", "south-asian", ["gluten-free"]
))

recipes.append(recipe(
    "Spinach Omelette", "Eggs cooked with fresh spinach and onions.",
    "10 min", "Easy",
    [("eggs", 3, ""), ("spinach", 1, "cup"), ("onion", 1, "small"), ("green chili", 1, ""), ("salt", "", "to taste")],
    ["Beat eggs. Sauté spinach and onion briefly.", "Pour eggs over, cook until set, fold."],
    ["Wilt spinach first so it doesn't release water into the eggs."], (1, 230, "16g", "4g", "16g"),
    "Indian", "south-asian", ["gluten-free", "dairy-free"]
))

# Final output
print(f"Total recipes: {len(recipes)}")

# Check for duplicate IDs
ids = [r["id"] for r in recipes]
dupes = [x for x in ids if ids.count(x) > 1]
if dupes:
    print(f"DUPLICATE IDS: {set(dupes)}")
    # Fix duplicates
    seen = {}
    for r in recipes:
        if r["id"] in seen:
            r["id"] = r["id"] + "-v2"
        seen[r["id"]] = True

with open("chunk-breakfast-full.json", "w") as f:
    json.dump(recipes, f, indent=2)

print(f"Written to chunk-breakfast-full.json")
print(f"Fried items: {[r['name'] for r in recipes if 'fried' in r.get('tags', [])]}")
print(f"High-sugar items: {[r['name'] for r in recipes if 'high-sugar' in r.get('tags', [])]}")
