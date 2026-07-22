import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const sourceRoot = argument("--source");
const kind = argument("--kind");
const requestedFiles = (argument("--files") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!sourceRoot || !["sets", "cards", "imports"].includes(kind)) {
  throw new Error(
    "Usage: node scripts/catalogueSnapshot.mjs --source <pokemon-tcg-data> " +
      "--kind <sets|cards|imports> [--files set1.json,set2.json]",
  );
}

const setRows = JSON.parse(readFileSync(join(sourceRoot, "sets/en.json"), "utf8"));
const setsById = new Map(setRows.map((set) => [set.id, set]));
const cardDirectory = join(sourceRoot, "cards/en");
const allCardFiles = readdirSync(cardDirectory)
  .filter((file) => file.endsWith(".json"))
  .sort();

function mappedSets() {
  return setRows.map((set) => ({
    id: set.id,
    name: set.name,
    series: set.series ?? null,
    printed_total: set.printedTotal ?? null,
    total: set.total ?? null,
    ptcgo_code: set.ptcgoCode ?? null,
    release_date: set.releaseDate ?? null,
    logo_url: set.images?.logo ?? null,
    symbol_url: set.images?.symbol ?? null,
    legalities: set.legalities ?? null,
    images: set.images ?? null,
  }));
}

function selectedFiles() {
  if (requestedFiles.length === 0) return allCardFiles;
  const allowed = new Set(allCardFiles);
  for (const file of requestedFiles) {
    if (!allowed.has(file) || basename(file) !== file) {
      throw new Error(`Unknown catalogue file: ${file}`);
    }
  }
  return requestedFiles;
}

function mappedCards() {
  return selectedFiles().flatMap((file) => {
    const setId = file.replace(/\.json$/i, "");
    const set = setsById.get(setId);
    if (!set) throw new Error(`No set metadata for ${setId}`);

    const cards = JSON.parse(readFileSync(join(cardDirectory, file), "utf8"));
    return cards.map((card) => ({
      id: card.id,
      name: card.name ?? "Unknown",
      supertype: card.supertype ?? null,
      subtypes: card.subtypes ?? null,
      hp: card.hp ?? null,
      types: card.types ?? null,
      set_id: setId,
      set_name: set.name,
      number: card.number ?? null,
      artist: card.artist ?? null,
      rarity: card.rarity ?? null,
      flavor_text: card.flavorText ?? null,
      images: card.images ?? null,
      tcgplayer_prices: card.tcgplayer?.prices ?? null,
      small_image_url: card.images?.small ?? null,
      large_image_url: card.images?.large ?? null,
    }));
  });
}

function mappedImports() {
  return allCardFiles.map((file) => {
    const setId = file.replace(/\.json$/i, "");
    const cards = JSON.parse(readFileSync(join(cardDirectory, file), "utf8"));
    return { set_id: setId, card_count: cards.length };
  });
}

const rows =
  kind === "sets" ? mappedSets() : kind === "cards" ? mappedCards() : mappedImports();

process.stdout.write(Buffer.from(JSON.stringify(rows), "utf8").toString("base64"));
