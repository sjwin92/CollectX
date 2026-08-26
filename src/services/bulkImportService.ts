// Bulk import — paste or upload a CSV of cards, add them to the collection,
// and (when a price is given and payouts are connected) list them for sale in
// one pass. Built for store accounts; useful to any heavy seller.

import { supabase } from "@/integrations/supabase/client";
import { addCardToCollection, type ExtendedCardItemWithDB } from "@/services/supabaseCollectionService";
import { createMarketplaceListing } from "@/services/supabaseMarketplaceService";

export interface ParsedRow {
  line: number;
  name: string;
  set_id: string;
  number: string;
  condition: string;
  quantity: number;
  price?: number;
  graded: boolean;
  grade_company?: string;
  grade?: string;
  for_trade: boolean;
  raw: string;
}

export interface ImportRowResult {
  line: number;
  name: string;
  status: "added" | "listed" | "skipped" | "error";
  message?: string;
}

export interface ImportSummary {
  added: number;
  listed: number;
  skipped: number;
  errors: number;
  rows: ImportRowResult[];
}

const HEADERS = ["name", "set_id", "number", "condition", "quantity", "price", "graded", "grade_company", "grade", "for_trade"];

export const CSV_TEMPLATE =
  "name,set_id,number,condition,quantity,price,graded,grade_company,grade,for_trade\n" +
  "Charizard ex,sv3pt5,199,near_mint,1,220.00,,,,false\n" +
  "Pikachu,base1,58,lightly_played,3,,,,,true\n" +
  "Blastoise,base1,2,near_mint,1,45,yes,PSA,9,false\n";

const truthy = (v?: string) => /^(y|yes|true|1|graded)$/i.test((v ?? "").trim());

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Parse CSV text → typed rows. Header row optional but recommended. */
export function parseImportCsv(text: string): { rows: ParsedRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ["Nothing to import."] };

  let startIdx = 0;
  let cols = HEADERS;
  const first = splitCsvLine(lines[0]).map((c) => c.toLowerCase());
  if (first.includes("name")) {
    cols = first;
    startIdx = 1;
  }

  const idx = (h: string) => cols.indexOf(h);
  const rows: ParsedRow[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const get = (h: string) => (idx(h) >= 0 ? cells[idx(h)] ?? "" : "");
    const name = get("name");
    if (!name) {
      errors.push(`Line ${i + 1}: missing card name — skipped.`);
      continue;
    }
    const qty = Math.max(1, parseInt(get("quantity") || "1", 10) || 1);
    const priceRaw = get("price").replace(/[^0-9.]/g, "");
    const price = priceRaw ? Number(priceRaw) : undefined;
    rows.push({
      line: i + 1,
      name,
      set_id: get("set_id").toLowerCase(),
      number: get("number"),
      condition: get("condition") || "near_mint",
      quantity: qty,
      price: price && price > 0 ? price : undefined,
      graded: truthy(get("graded")) || !!get("grade"),
      grade_company: get("grade_company") || undefined,
      grade: get("grade") || undefined,
      for_trade: truthy(get("for_trade")),
      raw: lines[i],
    });
  }
  return { rows, errors };
}

/** Best-effort: resolve rows to real pokemon_cards (id, image, rarity) by set + number. */
async function resolveCards(rows: ParsedRow[]): Promise<Map<string, { id: string; imageUrl?: string; rarity?: string; name: string }>> {
  const map = new Map<string, { id: string; imageUrl?: string; rarity?: string; name: string }>();
  const bySet = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.set_id || !r.number) continue;
    if (!bySet.has(r.set_id)) bySet.set(r.set_id, new Set());
    bySet.get(r.set_id)!.add(r.number);
  }
  await Promise.all(
    [...bySet.entries()].map(async ([setId, numbers]) => {
      const { data } = await supabase
        .from("pokemon_cards")
        .select("id, name, number, set_id, rarity, small_image_url, large_image_url")
        .eq("set_id", setId)
        .in("number", [...numbers]);
      for (const row of data ?? []) {
        map.set(`${setId}::${row.number}`, {
          id: row.id,
          name: row.name ?? "",
          rarity: row.rarity ?? undefined,
          imageUrl: row.small_image_url ?? row.large_image_url ?? undefined,
        });
      }
    }),
  );
  return map;
}

/**
 * Run the import. `listForSale` gates whether priced rows also become sale
 * listings (requires connected payouts — a per-row error is reported if not).
 */
export async function runBulkImport(rows: ParsedRow[], opts: { listForSale: boolean }): Promise<ImportSummary> {
  const resolved = await resolveCards(rows);
  const out: ImportRowResult[] = [];
  let added = 0, listed = 0, skipped = 0, errors = 0;

  for (const r of rows) {
    const match = r.set_id && r.number ? resolved.get(`${r.set_id}::${r.number}`) : undefined;
    const cardId = match?.id ?? (r.set_id && r.number ? `${r.set_id}-${r.number}` : r.name.toLowerCase().replace(/\s+/g, "-"));
    try {
      const dbId = await addCardToCollection({
        id: cardId,
        name: match?.name || r.name,
        imageUrl: match?.imageUrl,
        rarity: match?.rarity || "Unknown",
        condition: r.condition,
        number: r.number || undefined,
        set: r.set_id ? { id: r.set_id, name: r.set_id } : undefined,
        quantity: r.quantity,
        graded: r.graded,
        gradingCompany: r.grade_company,
        gradeScore: r.grade,
        forTrade: r.for_trade,
        estimatedValue: r.price != null ? String(r.price) : undefined,
      } as never);
      added += 1;

      if (opts.listForSale && r.price != null && r.price > 0) {
        try {
          await createMarketplaceListing(
            {
              id: cardId,
              name: match?.name || r.name,
              imageUrl: match?.imageUrl ?? "",
              rarity: match?.rarity ?? "Unknown",
              condition: r.condition,
              estimatedValue: String(r.price),
              set: r.set_id ? { id: r.set_id, name: r.set_id } : { id: "", name: "" },
              number: r.number || "",
              dbId,
            } as unknown as ExtendedCardItemWithDB,
            { listing_type: "sale", asking_price: r.price },
          );
          listed += 1;
          out.push({ line: r.line, name: r.name, status: "listed", message: `£${r.price.toFixed(2)}` });
        } catch (e) {
          const emsg =
            e instanceof Error ? e.message : (e as { message?: string })?.message ?? "unknown error";
          out.push({
            line: r.line,
            name: r.name,
            status: "added",
            message: /payout|stripe|charges|connect/i.test(emsg)
              ? "added — connect payouts to list it for sale"
              : `added — couldn't list: ${emsg}`,
          });
        }
      } else {
        out.push({ line: r.line, name: r.name, status: "added" });
      }
    } catch (e) {
      errors += 1;
      const emsg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "error";
      out.push({ line: r.line, name: r.name, status: "error", message: emsg });
    }
  }

  return { added, listed, skipped, errors, rows: out };
}
