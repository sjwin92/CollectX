import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Store as StoreIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMyStore } from "@/services/storeService";
import {
  listMyBuylistRules,
  upsertBuylistRule,
  deleteBuylistRule,
  setBuylistRuleActive,
  getMyBuylistOrders,
  payBuylistOrder,
  type BuylistRule,
} from "@/services/storeBuylistService";

const gbp = (n?: number | null) => (n == null ? "—" : `£${Number(n).toFixed(2)}`);
const emptyForm = { label: "", set_id: "", card_id: "", rarity: "", condition: "", pct_of_market: "60", min_gbp: "0.50", max_gbp: "", daily_cap_gbp: "" };

const StoreBuylist: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  const { data: store, isLoading: storeLoading } = useQuery({ queryKey: ["my-store"], queryFn: getMyStore });
  const { data: rules = [], refetch } = useQuery({ queryKey: ["my-buylist-rules"], queryFn: listMyBuylistRules, enabled: !!store });
  const { data: orders } = useQuery({ queryKey: ["my-buylist-orders"], queryFn: getMyBuylistOrders, enabled: !!store });

  if (storeLoading) return <Shell><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Shell>;

  if (!store) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <StoreIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg font-extrabold">Store account needed</h2>
          <p className="mt-1 text-sm text-muted-foreground">The buylist is for approved store accounts.</p>
          <Button asChild className="mt-4 rounded-full"><Link to="/store/apply">Apply for a store account</Link></Button>
        </div>
      </Shell>
    );
  }

  const startEdit = (r: BuylistRule) => {
    setEditing(r.id);
    setForm({
      label: r.label ?? "",
      set_id: r.set_id ?? "",
      card_id: r.card_id ?? "",
      rarity: r.rarity ?? "",
      condition: r.condition ?? "",
      pct_of_market: String(r.pct_of_market),
      min_gbp: String(r.min_gbp),
      max_gbp: r.max_gbp != null ? String(r.max_gbp) : "",
      daily_cap_gbp: r.daily_cap_gbp != null ? String(r.daily_cap_gbp) : "",
    });
  };

  const save = async () => {
    const pct = parseInt(form.pct_of_market, 10);
    if (!pct || pct < 1 || pct > 100) {
      toast({ variant: "destructive", title: "Set a % of market between 1 and 100" });
      return;
    }
    setSaving(true);
    try {
      await upsertBuylistRule({
        id: editing ?? undefined,
        label: form.label || null,
        set_id: form.set_id || null,
        card_id: form.card_id || null,
        rarity: form.rarity || null,
        condition: form.condition || null,
        pct_of_market: pct,
        min_gbp: parseFloat(form.min_gbp || "0") || 0,
        max_gbp: form.max_gbp ? parseFloat(form.max_gbp) : null,
        daily_cap_gbp: form.daily_cap_gbp ? parseFloat(form.daily_cap_gbp) : null,
      });
      toast({ title: editing ? "Offer updated" : "Buy offer added" });
      setForm({ ...emptyForm });
      setEditing(null);
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't save", description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const pay = async (orderId: string) => {
    setPaying(orderId);
    try {
      const url = await payBuylistOrder(orderId);
      window.location.href = url;
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't start checkout", description: e instanceof Error ? e.message : "Try again." });
      setPaying(null);
    }
  };

  const pending = (orders?.asStore ?? []).filter((o) => o.status === "pending_payment");
  const live = (orders?.asStore ?? []).filter((o) => ["paid_held", "shipped"].includes(o.status));

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{store.name}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">Buylist</h1>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full"><Link to="/store/inventory">Inventory</Link></Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Post standing prices to buy singles from collectors. A card you buy lands in your inventory at its quote cost. Platform takes a 2% spread from the collector's payout.
      </p>

      {/* Incoming offers */}
      {pending.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-extrabold">Offers to accept ({pending.length})</h2>
          <div className="mt-3 space-y-2">
            {pending.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{o.card_name}</div>
                  <div className="text-xs text-muted-foreground">
                    from {o.seller_name} · {o.condition?.replace(/_/g, " ")} · market {gbp(o.market_gbp)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-extrabold tabular-nums text-gold">{gbp(o.quote_amount)}</span>
                  <Button size="sm" className="rounded-full" disabled={paying === o.id} onClick={() => pay(o.id)}>
                    {paying === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay & accept"}
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="rounded-full"><Link to={`/buylist-orders/${o.id}`}>Details</Link></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {live.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-extrabold">In progress ({live.length})</h2>
          <div className="mt-3 space-y-2">
            {live.map((o) => (
              <button key={o.id} onClick={() => navigate(`/buylist-orders/${o.id}`)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary">
                <span className="truncate font-medium">{o.card_name}</span>
                <span className="text-xs text-muted-foreground">{o.status.replace("_", " ")} · {gbp(o.quote_amount)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rule editor */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display font-bold">{editing ? "Edit buy offer" : "Add a buy offer"}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input placeholder="Label (optional)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="h-9 sm:col-span-2" />
          <Input placeholder="set id (any)" value={form.set_id} onChange={(e) => setForm({ ...form, set_id: e.target.value })} className="h-9" />
          <Input placeholder="card id (any)" value={form.card_id} onChange={(e) => setForm({ ...form, card_id: e.target.value })} className="h-9" />
          <Input placeholder="rarity (any)" value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })} className="h-9" />
          <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">any condition</option>
            {["near_mint", "lightly_played", "moderately_played", "heavily_played", "damaged"].map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">% of market
            <Input type="number" value={form.pct_of_market} onChange={(e) => setForm({ ...form, pct_of_market: e.target.value })} className="h-9 w-16" />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">min £
            <Input type="number" step="0.01" value={form.min_gbp} onChange={(e) => setForm({ ...form, min_gbp: e.target.value })} className="h-9 w-20" />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">max £
            <Input type="number" step="0.01" placeholder="none" value={form.max_gbp} onChange={(e) => setForm({ ...form, max_gbp: e.target.value })} className="h-9 w-20" />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">daily cap £
            <Input type="number" step="0.01" placeholder="none" value={form.daily_cap_gbp} onChange={(e) => setForm({ ...form, daily_cap_gbp: e.target.value })} className="h-9 w-24" />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="rounded-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" /> {editing ? "Save" : "Add offer"}</>}
          </Button>
          {editing && <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setEditing(null); setForm({ ...emptyForm }); }}>Cancel</Button>}
        </div>
      </div>

      {/* Rules list */}
      <div className="mt-4 space-y-2">
        {rules.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No buy offers yet.</p>
        ) : (
          rules.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <div className="font-medium">
                  {r.label || `${r.pct_of_market}% of market`}
                  {!r.active && <span className="ml-2 text-xs text-muted-foreground">(paused)</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[r.set_id && `set ${r.set_id}`, r.card_id && `card ${r.card_id}`, r.rarity, r.condition?.replace(/_/g, " "),
                    `${r.pct_of_market}%`, `min ${gbp(r.min_gbp)}`, r.max_gbp != null && `max ${gbp(r.max_gbp)}`,
                    r.daily_cap_gbp != null && `cap ${gbp(r.daily_cap_gbp)}/day`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => { await setBuylistRuleActive(r.id, !r.active); refetch(); }}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${r.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground"}`}
                >
                  {r.active ? "Active" : "Paused"}
                </button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => startEdit(r)}>Edit</Button>
                <button onClick={async () => { await deleteBuylistRule(r.id); refetch(); }} className="text-muted-foreground hover:text-red-400" aria-label="Delete offer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="pt-6"><Link to="/store/setup" className="text-sm text-muted-foreground hover:underline">← Storefront</Link></div>
    </Shell>
  );
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1 pt-24 pb-16">
      <div className="container max-w-3xl">{children}</div>
    </main>
    <Footer />
  </div>
);

export default StoreBuylist;
