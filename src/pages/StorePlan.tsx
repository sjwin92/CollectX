import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Store as StoreIcon, Crown, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMyStore } from "@/services/storeService";
import {
  getBusinessPlans,
  getMySubscription,
  subscribeToPlan,
  cancelSubscription,
  listStoreMembers,
  addStoreMember,
  updateStoreMemberRole,
  removeStoreMember,
  type MemberRole,
} from "@/services/businessPlanService";

const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 ? 1 : 0)}%`;
const ROLES: MemberRole[] = ["lister", "shipper"];

const StorePlan: React.FC = () => {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({ handle: "", role: "lister" as MemberRole });
  const [addingMember, setAddingMember] = useState(false);

  const { data: store, isLoading: storeLoading } = useQuery({ queryKey: ["my-store"], queryFn: getMyStore });
  const { data: plans = [] } = useQuery({ queryKey: ["business-plans"], queryFn: getBusinessPlans });
  const { data: sub, refetch: refetchSub } = useQuery({ queryKey: ["my-subscription"], queryFn: getMySubscription, enabled: !!store });
  const { data: members = [], refetch: refetchMembers } = useQuery({ queryKey: ["store-members"], queryFn: listStoreMembers, enabled: !!store });

  useEffect(() => {
    const p = params.get("sub");
    if (!p) return;
    if (p === "1") { toast({ title: "Subscription active", description: "Your seller commission has been updated." }); refetchSub(); }
    else if (p === "cancelled") toast({ title: "Checkout cancelled", description: "No payment was taken." });
    setParams((prev) => { prev.delete("sub"); return prev; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (storeLoading) return <Shell><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Shell>;

  if (!store) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <StoreIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg font-extrabold">Store account needed</h2>
          <p className="mt-1 text-sm text-muted-foreground">Plans are for approved store accounts.</p>
          <Button asChild className="mt-4 rounded-full"><Link to="/store/apply">Apply for a store account</Link></Button>
        </div>
      </Shell>
    );
  }

  const active = sub && sub.status === "active";
  const standingPct = pct(store.commission_bps);

  const subscribe = async (planId: string) => {
    setBusy(planId);
    try {
      const url = await subscribeToPlan(planId);
      window.location.href = url;
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't start checkout", description: e instanceof Error ? e.message : "Try again." });
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      await cancelSubscription();
      toast({ title: "Cancellation scheduled", description: "Your plan runs until the end of the current period." });
      refetchSub();
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't cancel", description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(null);
    }
  };

  const addMember = async () => {
    setAddingMember(true);
    try {
      await addStoreMember(newMember.handle, newMember.role);
      toast({ title: "Seat added" });
      setNewMember({ handle: "", role: "lister" });
      refetchMembers();
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't add", description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setAddingMember(false);
    }
  };

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{store.name}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">Plan &amp; team</h1>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full"><Link to="/store/setup">← Storefront</Link></Button>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
        {active ? (
          <>
            <span className="font-semibold">On {plans.find((p) => p.id === sub!.plan_id)?.name ?? sub!.plan_id}</span>
            {" "}· £{sub!.price_gbp.toFixed(2)}/mo · seller commission{" "}
            <span className="font-semibold text-gold">{pct(sub!.seller_fee_bps < store.commission_bps ? sub!.seller_fee_bps : store.commission_bps)}</span>
            {sub!.current_period_end && (
              <span className="text-muted-foreground">
                {" "}· {sub!.cancel_at_period_end ? "ends" : "renews"} {new Date(sub!.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            )}
            {!sub!.cancel_at_period_end && (
              <Button variant="ghost" size="sm" className="ml-3 rounded-full text-muted-foreground" onClick={cancel} disabled={busy === "cancel"}>
                {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel"}
              </Button>
            )}
          </>
        ) : (
          <>Pay per sale — seller commission <span className="font-semibold text-gold">{standingPct}</span>. Subscribe to lower it.</>
        )}
        {sub && sub.status === "past_due" && (
          <p className="mt-1 text-amber-400">Payment failed — update your card to keep the plan rate.</p>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = active && sub!.plan_id === p.id;
          const effective = Math.min(p.seller_fee_bps, store.commission_bps);
          return (
            <div key={p.id} className={`flex flex-col rounded-2xl border p-4 ${isCurrent ? "border-gold/50 ring-1 ring-gold/20" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-extrabold">{p.name}</h3>
                {p.id === "pro" && <Crown className="h-4 w-4 text-gold" />}
              </div>
              <div className="mt-1 font-display text-2xl font-extrabold">£{p.price_gbp.toFixed(0)}<span className="text-sm font-semibold text-muted-foreground">/mo</span></div>
              <div className="mt-1 text-xs font-semibold text-gold">Seller commission {pct(effective)}</div>
              <p className="mt-2 flex-1 text-xs text-muted-foreground">{p.blurb}</p>
              <Button
                className="mt-3 w-full rounded-full"
                variant={isCurrent ? "secondary" : "default"}
                disabled={isCurrent || busy === p.id}
                onClick={() => subscribe(p.id)}
              >
                {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? <><Check className="mr-1.5 h-4 w-4" /> Current</> : active ? "Switch" : "Subscribe"}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        The plan rate applies while active; if your standing rate ({standingPct}) is already lower, you keep it.
      </p>

      {/* Team */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold"><Users className="h-4 w-4" /> Team</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Add people to help run the store. Listers manage inventory; shippers handle orders.
          {sub?.plan_id === "starter" && " Team seats are a Growth/Pro feature."}
        </p>
        <div className="mt-3 space-y-2">
          {members.length === 0 && <p className="text-sm text-muted-foreground">Just you so far.</p>}
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{m.name}</div>
                {m.username && <div className="text-xs text-muted-foreground">@{m.username}</div>}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={m.role}
                  onChange={async (e) => { await updateStoreMemberRole(m.user_id, e.target.value as MemberRole); refetchMembers(); }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={async () => { await removeStoreMember(m.user_id); refetchMembers(); }} className="text-muted-foreground hover:text-red-400" aria-label="Remove seat">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input placeholder="username" value={newMember.handle} onChange={(e) => setNewMember({ ...newMember, handle: e.target.value })} className="h-9 max-w-[200px]" />
          <select value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value as MemberRole })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <Button size="sm" className="rounded-full" onClick={addMember} disabled={addingMember || !newMember.handle.trim()}>
            {addingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add seat"}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Note: seat permissions on inventory &amp; orders are rolling out — for now the roster is recorded and the owner acts.
        </p>
      </div>
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

export default StorePlan;
