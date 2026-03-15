#!/usr/bin/env node
/**
 * Combines all chunk-*.json files into recipe-glossary-seed.json
 * Run: node combine-chunks.js
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const chunkOrder = [
  'chunk-sa-breakfast.json',
  'chunk-sa-lunch1.json',
  'chunk-sa-lunch2.json',
  'chunk-sa-dinner.json',
  'chunk-sa-sides.json',
  'chunk-sa-snacks.json',
  'chunk-eu1.json',
  'chunk-eu2.json',
  'chunk-american.json',
  'chunk-east-asian.json',
  'chunk-middle-eastern.json',
  'chunk-global.json',
];

let all = [];
const ids = new Set();

for (const file of chunkOrder) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing: ${file}`);
    process.exit(1);
  }
  const chunk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const recipe of chunk) {
    // Normalize: ensure lastUsedAt is empty string per spec
    recipe.lastUsedAt = "";
    // Ensure createdAt is correct
    recipe.createdAt = "2026-03-08T00:00:00.000Z";
    // Ensure source is seed
    recipe.source = "seed";
    recipe.useCount = 0;
    recipe.avgRating = 0;

    if (ids.has(recipe.id)) {
      console.warn(`  DUPLICATE id: "${recipe.id}" in ${file} — skipping`);
      continue;
    }
    ids.add(recipe.id);
    all.push(recipe);
  }
  console.log(`${file}: ${chunk.length} recipes (total so far: ${all.length})`);
}

console.log(`\nTotal unique recipes: ${all.length}`);

// Validate required fields
let errors = 0;
for (const r of all) {
  if (!r.id || !r.name || !r.description || !r.cookTime || !r.difficulty) {
    console.error(`Missing basic fields in: ${r.id || 'UNKNOWN'}`);
    errors++;
  }
  if (!r.ingredients || r.ingredients.length === 0) {
    console.error(`No ingredients in: ${r.id}`);
    errors++;
  }
  if (!r.instructions || r.instructions.length < 3) {
    console.error(`Too few instructions in: ${r.id} (${r.instructions?.length || 0})`);
    errors++;
  }
  if (!r.cuisine || r.cuisine.length === 0) {
    console.error(`No cuisine in: ${r.id}`);
    errors++;
  }
  if (!r.mealTypes || r.mealTypes.length === 0) {
    console.error(`No mealTypes in: ${r.id}`);
    errors++;
  }
  if (!r.region) {
    console.error(`No region in: ${r.id}`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n${errors} validation errors found!`);
  process.exit(1);
}

// Count by region
const regionCounts = {};
for (const r of all) {
  regionCounts[r.region] = (regionCounts[r.region] || 0) + 1;
}
console.log('\nBy region:');
for (const [region, count] of Object.entries(regionCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${region}: ${count}`);
}

const outPath = path.join(dir, 'recipe-glossary-seed.json');
fs.writeFileSync(outPath, JSON.stringify(all, null, 2));
console.log(`\nWritten to ${outPath} (${all.length} recipes)`);
