// Fills the virtual cat's shop with a starter set. Safe to re-run: items are
// matched on their unique key and updated rather than duplicated, and nothing
// is ever deleted, so prices an admin has since edited are the only thing that
// gets reset.
//
//   node scripts/seed-pet-shop.mjs
import "dotenv/config";
import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// slot must match the garment's slot in src/components/pet-cat.tsx.
const ITEMS = [
  // key, name, kind, slot, cost, hunger, happiness, order
  ["food-kibble", "Bowl of kibble", "FOOD", null, 8, 25, 2, 10],
  ["food-fish", "Grilled fish", "FOOD", null, 18, 50, 8, 20],
  ["food-feast", "Birthday feast", "FOOD", null, 40, 100, 20, 30],
  ["snack-milk", "Saucer of milk", "SNACK", null, 6, 8, 15, 10],
  ["snack-treat", "Cat treats", "SNACK", null, 12, 12, 28, 20],
  ["snack-catnip", "Pinch of catnip", "SNACK", null, 25, 0, 55, 30],
  ["hat-cap", "Baseball cap", "CLOTHING", "head", 60, 0, 0, 10],
  ["hat-party", "Party hat", "CLOTHING", "head", 80, 0, 0, 20],
  ["hat-wizard", "Wizard hat", "CLOTHING", "head", 140, 0, 0, 30],
  ["hat-crown", "Golden crown", "CLOTHING", "head", 250, 0, 0, 40],
  ["bowtie", "Bow tie", "CLOTHING", "neck", 50, 0, 0, 50],
  ["scarf-red", "Red scarf", "CLOTHING", "neck", 70, 0, 0, 60],
  ["scarf-stripe", "Striped scarf", "CLOTHING", "neck", 90, 0, 0, 70],
  ["jumper-knit", "Knitted jumper", "CLOTHING", "body", 120, 0, 0, 80],
  ["cape-hero", "Hero cape", "CLOTHING", "body", 200, 0, 0, 90],
];

const now = new Date().toISOString().replace("Z", "+00:00");

let created = 0;
let updated = 0;

for (const [key, name, kind, slot, cost, hunger, happiness, sortOrder] of ITEMS) {
  const existing = await client.execute({
    sql: `SELECT id FROM PetItem WHERE key = ?`,
    args: [key],
  });

  if (existing.rows.length) {
    await client.execute({
      sql: `UPDATE PetItem SET name=?, kind=?, slot=?, cost=?, hungerEffect=?, happinessEffect=?, sortOrder=?, updatedAt=? WHERE key=?`,
      args: [name, kind, slot, cost, hunger, happiness, sortOrder, now, key],
    });
    updated++;
  } else {
    await client.execute({
      sql: `INSERT INTO PetItem (id, key, name, kind, slot, cost, hungerEffect, happinessEffect, isActive, sortOrder, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      args: [randomUUID(), key, name, kind, slot, cost, hunger, happiness, sortOrder, now, now],
    });
    created++;
  }
}

console.log(`pet shop seeded - ${created} created, ${updated} updated`);

const counts = await client.execute(
  `SELECT kind, COUNT(*) n, MIN(cost) lo, MAX(cost) hi FROM PetItem GROUP BY kind ORDER BY kind`
);
for (const row of counts.rows) {
  console.log(`  ${String(row.kind).padEnd(9)} ${row.n} items, ${row.lo}-${row.hi} pts`);
}
