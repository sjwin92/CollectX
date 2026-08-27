import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Trash2, Upload, Store as StoreIcon, Plus, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getMyStore } from "@/services/storeService";
import { createPromotionCheckout, getMyPromotions, getPromotionPrices } from "@/services/storePromotionService";
import {
  listInventory,
  getPriceRules,
  ensureDefaultRule,
  updatePriceRule,
  patchSku,
  deleteSku,
  upsertSku,
  repriceNow,
  inventoryStats,
  type InventoryItem,
} from "@/services/storeInventoryService";
import { CARD_CONDITIONS } from "@/lib/cardCondition";

const gbp = (n?: number | null) =>
  n == null ? "—" : `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const StoreInventory: React.FC = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const p = params.get("promoted");
    if (!p) return;
    if (p === "1") toast({ title: "Promotion live", description: "Your featured listing is now showing in the marketplace." });
    else if (p === "cancelled") toast({ title: "Checkout cancelled", description: "No payment was taken." });
    setParams((prev) => { prev.delete("promoted"); return prev; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const { data: store, isLoading: storeLoading } = useQuery({ queryKey: ["my-store"], queryFn: getMyStore });
  const { data: items = [], refetch, isFetching } = useQuery({
    queryKey: ["store-inventory", search],
    queryFn: () => listInventory(search),
    enabled: !!store,
  });
  const { data: rules = [], refetch: refetchRules } = useQuery({
    queryKey: ["store-price-rules"],
    queryFn: getPriceRules,
    enabled: !!store,
  });
  const { data: promos } = useQuery({
    queryKey: ["my-promotions"],
    queryFn: getMyPromotions,
    enabled: !!store,
  });
  const { data: promoPrices } = useQuery({
    queryKey: ["promotion-prices"],
    queryFn: getPromotionPrices,
    enabled: !!store,
  });

  const rule = rules.find((r) => r.is_default) ?? rules[0];
  const stats = useMemo(() => inventoryStats(items), [items]);

  if (storeLoading) return <Shell><Center><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Center></Shell>;

  if (!store) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <StoreIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg font-extrabold">Store account needed</h2>
          <p className="mt-1 text-sm text-muted-foreground">Inventory is for approved store accounts.</p>
          <Button asChild className="mt-4 rounded-full"><Link to="/store/apply">Apply for a store account</Link></Button>
        </div>
      </Shell>
    );
  }

  const ensureRule = async () => {
    const r = await ensureDefaultRule();
    await refetchRules();
    return r;
  };

  const reprice = async () => {
    setBusy(true);
    try {
      let r = rule;
      if (!r) r = await ensureRule();
      const res = await repriceNow();
      toast({ title: "Repriced", description: `${res.skusRepriced} updated${res.skusSkipped ? `, ${res.skusSkipped} skipped (no market price)` : ""}.` });
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Reprice failed", description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  const saveRule = async (patch: Parameters<typeof updatePriceRule>[1]) => {
    const r = rule ?? (await ensureRule());
    await updatePriceRule(r.id, patch);
    refetchRules();
  };

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{store.name}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">Inventory</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/store/import"><Upload className="mr-1.5 h-4 w-4" /> Bulk import</Link>
          </Button>
          <Button size="sm" className="rounded-full" onClick={reprice} disabled={busy || items.length === 0}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
            Reprice now
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="SKUs" v={String(stats.skus)} />
        <Stat label="Units" v={String(stats.units)} />
        <Stat label="Cost value" v={gbp(stats.costValue)} />
        <Stat label="List value" v={gbp(stats.listValue)} gold />
        <Stat label="Market value" v={gbp(stats.marketValue)} />
        <Stat label="Below market" v={String(stats.belowMarket)} warn={stats.belowMarket > 0} />
      </div>

      {/* Price rule */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-display font-bold">Pricing rule</span>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            List at
            <Input
              type="number"
              defaultValue={rule?.pct_of_market ?? 95}
              onBlur={(e) => saveRule({ pct_of_market: Math.max(1, parseInt(e.target.value || "95", 10)) })}
              className="h-8 w-16"
            />
            % of market
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            Floor £
            <Input
              type="number"
              step="0.01"
              defaultValue={rule?.floor_gbp ?? 0.5}
              onBlur={(e) => saveRule({ floor_gbp: Math.max(0, parseFloat(e.target.value || "0")) })}
              className="h-8 w-20"
            />
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <input
              type="checkbox"
              defaultChecked={rule?.never_below_cost ?? true}
              onChange={(e) => saveRule({ never_below_cost: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            Never below cost
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          "Reprice now" applies this to every SKU. A nightly job keeps prices current.
        </p>
      </div>

      <AddSku onAdded={() => refetch()} defaultRuleId={rule?.id} />

      {/* Table */}
      <div className="mt-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search inventory…"
          className="h-9 max-w-xs"
        />
        {isFetching && items.length === 0 ? (
          <Center><Loader2 className="mt-8 h-6 w-6 animate-spin text-muted-foreground" /></Center>
        ) : items.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No inventory yet — <Link to="/store/import" className="text-primary hover:underline">bulk import a CSV</Link> or add a card above.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Card</th>
                  <th className="px-3 py-2 text-left">Cond.</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Market</th>
                  <th className="px-3 py-2 text-right">Margin</th>
                  <th className="px-3 py-2 text-center">Promote</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <InvRow
                    key={it.id}
                    it={it}
                    onChange={() => refetch()}
                    toast={toast}
                    promoEndsAt={promos?.skus.has(it.id) ? promos.skus.get(it.id) ?? "pending" : null}
                    featurePrice={promoPrices?.sku_feature_gbp ?? 2.99}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
};

const InvRow = ({
  it,
  onChange,
  toast,
  promoEndsAt,
  featurePrice,
}: {
  it: InventoryItem;
  onChange: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  promoEndsAt: string | null;
  featurePrice: number;
}) => {
  const [promoting, setPromoting] = useState(false);
  const margin =
    it.price_gbp != null && it.cost_gbp != null && Number(it.cost_gbp) > 0
      ? ((Number(it.price_gbp) - Number(it.cost_gbp)) / Number(it.cost_gbp)) * 100
      : null;
  const below = it.market_gbp != null && it.price_gbp != null && it.price_gbp < it.market_gbp * 0.9;

  const promote = async () => {
    setPromoting(true);
    try {
      const url = await createPromotionCheckout("sku_feature", it.id);
      window.location.href = url;
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't start checkout", description: e instanceof Error ? e.message : "Try again." });
      setPromoting(false);
    }
  };

  const save = async (patch: Parameters<typeof patchSku>[1]) => {
    try {
      await patchSku(it.id, patch);
      onChange();
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't save", description: e instanceof Error ? e.message : "Try again." });
    }
  };

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2">
        <div className="font-medium">{it.card_name}</div>
        <div className="text-xs text-muted-foreground">
          {it.set_id || "—"}{it.card_number && ` · ${it.card_number}`}
          {it.is_graded && ` · ${it.grade_company ?? ""} ${it.grade_score ?? ""}`}
        </div>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{it.condition}</td>
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          defaultValue={it.quantity}
          onBlur={(e) => {
            const v = Math.max(0, parseInt(e.target.value || "0", 10));
            if (v !== it.quantity) save({ quantity: v });
          }}
          className="w-14 rounded border border-border bg-transparent px-1 py-0.5 text-right tabular-nums"
        />
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{gbp(it.cost_gbp)}</td>
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          step="0.01"
          defaultValue={it.price_gbp ?? ""}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            const v = raw === "" ? null : Math.max(0, parseFloat(raw));
            if (v !== it.price_gbp) save({ price_gbp: v });
          }}
          className={`w-20 rounded border bg-transparent px-1 py-0.5 text-right tabular-nums ${below ? "border-red-500/50 text-red-400" : "border-border"}`}
        />
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{gbp(it.market_gbp)}</td>
      <td className={`px-3 py-2 text-right tabular-nums ${margin != null && margin < 0 ? "text-red-400" : "text-muted-foreground"}`}>
        {margin != null ? `${margin >= 0 ? "+" : ""}${margin.toFixed(0)}%` : "—"}
      </td>
      <td className="px-3 py-2 text-center">
        {promoEndsAt ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold">
            <Sparkles className="h-3 w-3" />
            {promoEndsAt === "pending" ? "Pending" : `Ends ${new Date(promoEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
          </span>
        ) : (
          <button
            onClick={promote}
            disabled={promoting || !it.listed || it.price_gbp == null}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:border-gold/40 hover:text-gold disabled:opacity-40"
            title={!it.listed || it.price_gbp == null ? "List and price the card first" : `Feature for 7 days · £${featurePrice.toFixed(2)}`}
          >
            {promoting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            £{featurePrice.toFixed(2)}
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={() => save({ listed: !it.listed })}
          className={`mr-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            it.listed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground"
          }`}
        >
          {it.listed ? "Listed" : "Hidden"}
        </button>
        <button
          onClick={async () => {
            await deleteSku(it.id);
            onChange();
          }}
          className="text-muted-foreground hover:text-red-400"
          aria-label="Remove SKU"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
};

const AddSku = ({ onAdded, defaultRuleId }: { onAdded: () => void; defaultRuleId?: string }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", set_id: "", number: "", condition: "NM", quantity: "1", cost: "" });

  const add = async () => {
    if (!f.name.trim()) return;
    setSaving(true);
    try {
      let cardId = f.set_id && f.number ? `${f.set_id.toLowerCase()}-${f.number}` : f.name.toLowerCase().replace(/\s+/g, "-");
      let image: string | null = null;
      let rarity: string | null = null;
      let name = f.name.trim();
      if (f.set_id && f.number) {
        const { data } = await supabase
          .from("pokemon_cards")
          .select("id, name, rarity, small_image_url, large_image_url")
          .eq("set_id", f.set_id.toLowerCase())
          .eq("number", f.number)
          .maybeSingle();
        if (data) {
          cardId = data.id;
          name = data.name ?? name;
          rarity = data.rarity ?? null;
          image = data.small_image_url ?? data.large_image_url ?? null;
        }
      }
      await upsertSku({
        card_id: cardId,
        card_name: name,
        set_id: f.set_id.toLowerCase() || null,
        card_number: f.number || null,
        rarity,
        image_url: image,
        condition: f.condition,
        quantity: Math.max(1, parseInt(f.quantity || "1", 10)),
        cost_gbp: f.cost ? Math.max(0, parseFloat(f.cost)) : null,
        price_rule_id: defaultRuleId ?? null,
      });
      toast({ title: "Added to inventory", description: name });
      setF({ name: "", set_id: "", number: "", condition: "NM", quantity: "1", cost: "" });
      setOpen(false);
      onAdded();
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't add", description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Add a card
      </Button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <Input placeholder="Card name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-9 sm:col-span-2" />
        <Input placeholder="set id" value={f.set_id} onChange={(e) => setF({ ...f, set_id: e.target.value })} className="h-9" />
        <Input placeholder="no." value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} className="h-9" />
        <select value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          {CARD_CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <Input type="number" placeholder="qty" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} className="h-9" />
        <Input type="number" step="0.01" placeholder="cost £" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} className="h-9" />
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="sm" className="rounded-full" onClick={add} disabled={saving || !f.name.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
};

const Stat = ({ label, v, gold, warn }: { label: string; v: string; gold?: boolean; warn?: boolean }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`mt-1 font-display text-lg font-extrabold tabular-nums ${gold ? "text-gold" : warn ? "text-red-400" : ""}`}>{v}</div>
  </div>
);

const Center = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-center py-6">{children}</div>
);

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1 pt-24 pb-16">
      <div className="container max-w-4xl">
        <Link to="/store/setup" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          ← Storefront
        </Link>
        {children}
      </div>
    </main>
    <Footer />
  </div>
);

export default StoreInventory;
