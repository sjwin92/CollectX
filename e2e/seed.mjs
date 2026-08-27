// Seeds a dedicated end-to-end test account and a couple of collection cards,
// and clears anything left over from a previous run so the authed specs start
// from a known state.
//
// The Supabase service_role key is read live from the authed `supabase` CLI
// and never written to disk. The only persisted secret is the test account's
// own password, which you can override with E2E_PASSWORD.

import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "yfzfyeoaisspqlziaufx";
const SUPABASE_URL = process.env.SUPABASE_URL ?? `https://${PROJECT_REF}.supabase.co`;

const HERE = dirname(fileURLToPath(import.meta.url));
export const CREDS_PATH = `${HERE}/.auth/creds.json`;

export const E2E_EMAIL = process.env.E2E_EMAIL ?? "e2e-tester@collectx-e2e.test";
// A fresh random password is set on the account every seed and written to the
// gitignored creds file — nothing sensitive is committed.
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? `e2e-${randomBytes(18).toString("base64url")}`;

// Real catalogue cards to drop into the test account's collection.
const SEED_CARDS = [
  { card_id: "ecard3-H10", card_name: "Gyarados", set_id: "ecard3", set_name: "Skyridge", card_number: "H10", rarity: "Rare Holo", card_image: "https://images.pokemontcg.io/ecard3/H10.png" },
  { card_id: "ecard3-H11", card_name: "Houndoom", set_id: "ecard3", set_name: "Skyridge", card_number: "H11", rarity: "Rare Holo", card_image: "https://images.pokemontcg.io/ecard3/H11.png" },
];

function serviceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const raw = execSync(`supabase projects api-keys --project-ref ${PROJECT_REF} -o json`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed.keys;
  const key = list?.find((k) => k.id === "service_role")?.api_key;
  if (!key) throw new Error("Could not read the service_role key from the supabase CLI");
  return key;
}

export async function seedE2E() {
  const admin = createClient(SUPABASE_URL, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Find or create the user, with a known confirmed password.
  let userId;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email === E2E_EMAIL)?.id;
    if (data.users.length < 200) break;
  }
  if (userId) {
    await admin.auth.admin.updateUserById(userId, { password: E2E_PASSWORD, email_confirm: true });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  }

  // Reset state from any previous run.
  await admin.from("marketplace_listings").delete().eq("user_id", userId);
  await admin.from("content_reports").delete().eq("reporter_id", userId);
  await admin.from("user_cards").delete().eq("user_id", userId);

  // Seed the collection.
  const { error: insErr } = await admin.from("user_cards").insert(
    SEED_CARDS.map((c) => ({
      user_id: userId,
      product_type: "single",
      quantity: 1,
      condition: "near_mint",
      is_graded: false,
      ...c,
    })),
  );
  if (insErr) throw insErr;

  const creds = { userId, email: E2E_EMAIL, password: E2E_PASSWORD };
  mkdirSync(dirname(CREDS_PATH), { recursive: true });
  writeFileSync(CREDS_PATH, JSON.stringify(creds, null, 2));
  return creds;
}

// Allow `node e2e/seed.mjs` for a manual reseed.
if (import.meta.url === `file://${process.argv[1]}`) {
  seedE2E()
    .then((r) => {
      console.log(`Seeded ${r.email} (${r.userId}) with ${SEED_CARDS.length} cards.`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
