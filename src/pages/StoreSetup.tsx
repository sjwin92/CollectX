import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Store, ExternalLink, Megaphone, CreditCard, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMyStore, updateMyStore, activateStore } from "@/services/storeService";
import { createPromotionCheckout, getMyPromotions, getPromotionPrices } from "@/services/storePromotionService";
import { getSellerStripeStatus, startSellerOnboarding } from "@/services/supabaseMarketplaceService";

const StoreSetup: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", logo_url: "", website: "", city: "" });
  const [params, setParams] = useSearchParams();

  const { data: store, isLoading, refetch } = useQuery({ queryKey: ["my-store"], queryFn: getMyStore });
  const { data: promos } = useQuery({ queryKey: ["my-promotions"], queryFn: getMyPromotions, enabled: !!store });
  const { data: promoPrices } = useQuery({ queryKey: ["promotion-prices"], queryFn: getPromotionPrices, enabled: !!store });
  const { data: payoutStatus } = useQuery({ queryKey: ["seller-stripe-status"], queryFn: getSellerStripeStatus, enabled: !!store });

  const connectPayouts = async () => {
    setConnecting(true);
    try {
      window.location.href = await startSellerOnboarding();
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't start payout setup", description: err instanceof Error ? err.message : "Try again." });
      setConnecting(false);
    }
  };

  useEffect(() => {
    const p = params.get("promoted");
    if (!p) return;
    if (p === "1") toast({ title: "Storefront pinned", description: "Your store now sorts to the top of the marketplace." });
    else if (p === "cancelled") toast({ title: "Checkout cancelled", description: "No payment was taken." });
    setParams((prev) => { prev.delete("promoted"); return prev; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const pinStorefront = async () => {
    setPinning(true);
    try {
      const url = await createPromotionCheckout("storefront_pin");
      window.location.href = url;
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't start checkout", description: err instanceof Error ? err.message : "Try again." });
      setPinning(false);
    }
  };

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name ?? "",
        bio: store.bio ?? "",
        logo_url: store.logo_url ?? "",
        website: store.website ?? "",
        city: store.location?.city ?? "",
      });
    }
  }, [store]);

  if (isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  if (!store) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg font-extrabold">No store account yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Store accounts are approved from an application.
          </p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/store/apply">Apply for a store account</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await updateMyStore({
        name: form.name.trim(),
        bio: form.bio.trim() || null,
        logo_url: form.logo_url.trim() || null,
        website: form.website.trim() || null,
        location: form.city.trim() ? { city: form.city.trim() } : null,
      });
      toast({ title: "Saved" });
      refetch();
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't save", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const goLive = async () => {
    setSaving(true);
    try {
      await updateMyStore({
        name: form.name.trim(),
        bio: form.bio.trim() || null,
        logo_url: form.logo_url.trim() || null,
        website: form.website.trim() || null,
        location: form.city.trim() ? { city: form.city.trim() } : null,
      });
      const live = await activateStore();
      toast({ title: "Your store is live", description: "Collectors can find you now." });
      navigate(`/store/${live.slug}`);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't publish", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Your storefront</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">{store.name}</h1>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            store.status === "active"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-border bg-secondary text-muted-foreground"
          }`}
        >
          {store.status === "active" ? "Live" : "Draft"}
        </span>
      </div>

      {payoutStatus && !payoutStatus.charges_enabled && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <CreditCard className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Connect payouts to get paid</p>
            <p className="text-xs text-muted-foreground">
              You can list stock now, but buyers can't check out until your Stripe account is connected.
            </p>
          </div>
          <Button className="rounded-full" onClick={connectPayouts} disabled={connecting}>
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : (payoutStatus.onboarding_status === "pending" || payoutStatus.onboarding_status === "restricted" ? "Finish payout setup" : "Connect payouts")}
          </Button>
        </div>
      )}
      {payoutStatus?.charges_enabled && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Payouts connected — you're ready to sell.
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4">
          <F label="Store name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </F>
          <F label="About your shop" hint="shown on your storefront">
            <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Logo URL" hint="optional">
              <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://" />
            </F>
            <F label="City" hint="optional">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </F>
          </div>
          <F label="Website" hint="optional">
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
          </F>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <Button variant="outline" className="rounded-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save draft"}
          </Button>
          {store.status !== "active" ? (
            <Button className="rounded-full" onClick={goLive} disabled={saving || !form.name.trim()}>
              Publish storefront
            </Button>
          ) : (
            <Button asChild variant="secondary" className="rounded-full">
              <Link to={`/store/${store.slug}`}>
                View storefront <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/store/inventory">Inventory</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/store/buylist">Buylist</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/store/import">Bulk import</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/store/plan">Plan{store.subscription_tier !== "none" ? ` · ${store.subscription_tier}` : ""}</Link>
          </Button>
          {store.status === "active" && (
            promos?.storefrontPin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                <Megaphone className="h-3.5 w-3.5" /> Pinned · ends {new Date(promos.storefrontPin).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            ) : promos?.pendingStorefront ? (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">Pin checkout pending</span>
            ) : (
              <Button variant="outline" className="rounded-full" onClick={pinStorefront} disabled={pinning}>
                {pinning ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Megaphone className="mr-1.5 h-4 w-4" /> Feature storefront · £{(promoPrices?.storefront_pin_gbp ?? 9.99).toFixed(2)}</>}
              </Button>
            )
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            Selling fee: <span className="font-semibold text-gold">{(store.commission_bps / 100).toFixed(1)}%</span>
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Add stock in <Link to="/store/inventory" className="text-primary hover:underline">Inventory</Link> (or
        {" "}<Link to="/store/import" className="text-primary hover:underline">bulk-import a CSV</Link>), post standing
        buy prices in <Link to="/store/buylist" className="text-primary hover:underline">Buylist</Link>. Sales are
        held in escrow and paid out to your connected Stripe account once the buyer confirms delivery.
      </p>
    </Shell>
  );
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1 pt-24 pb-16">
      <div className="container max-w-lg">{children}</div>
    </main>
    <Footer />
  </div>
);

const F = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm">
      {label}
      {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({hint})</span>}
    </Label>
    {children}
  </div>
);

export default StoreSetup;
