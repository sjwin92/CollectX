import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SmartImage } from "@/components/common/SmartImage";
import { Loader2, Store, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollection } from "@/services/supabaseCollectionService";
import { useCardPrices } from "@/hooks/useCardPrices";
import {
  listActiveBuylistRules,
  allOffers,
  bestOffer,
  createBuylistOffer,
  type BuylistOffer,
} from "@/services/storeBuylistService";

const gbp = (n: number) => `£${n.toFixed(2)}`;

type Sellable = {
  dbId: string;
  card_id: string;
  name: string;
  imageUrl: string;
  set_id: string;
  rarity: string;
  condition: string;
  is_graded: boolean;
};

const Sell: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<Sellable | null>(null);
  const [offering, setOffering] = useState<string | null>(null);

  const { data: collection = [], isLoading: colLoading } = useQuery({
    queryKey: ["collection"],
    queryFn: getCollection,
  });
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ["active-buylist-rules"],
    queryFn: listActiveBuylistRules,
  });

  const sellables: Sellable[] = useMemo(
    () =>
      collection
        .filter((c) => !c.isSealed && (c.quantity ?? 1) >= 1)
        .map((c) => ({
          dbId: (c as { dbId: string }).dbId,
          card_id: c.id,
          name: c.name,
          imageUrl: c.imageUrl || "",
          set_id: c.set?.id || "",
          rarity: c.rarity || "",
          condition: c.condition || "near_mint",
          is_graded: !!c.graded,
        }))
        .filter((c) => !!c.dbId),
    [collection],
  );

  const prices = useCardPrices(sellables.map((c) => c.card_id));

  const rows = useMemo(() => {
    return sellables
      .map((c) => {
        const market = prices.get(c.card_id) ?? 0;
        const best = market > 0 ? bestOffer(rules, c, market) : null;
        return { card: c, market, best };
      })
      .filter((r) => r.best)
      .sort((a, b) => (b.best!.quote_gbp) - (a.best!.quote_gbp));
  }, [sellables, prices, rules]);

  const pickedOffers: BuylistOffer[] = useMemo(() => {
    if (!picked) return [];
    const market = prices.get(picked.card_id) ?? 0;
    return market > 0 ? allOffers(rules, picked, market) : [];
  }, [picked, prices, rules]);

  const sendOffer = async (offer: BuylistOffer) => {
    if (!picked) return;
    setOffering(offer.buylist_id);
    try {
      const { order_id } = await createBuylistOffer(offer.buylist_id, picked.dbId);
      toast({ title: `Offer sent to ${offer.store_name}`, description: `They'll pay ${gbp(offer.quote_gbp)} once they accept.` });
      setPicked(null);
      navigate(`/buylist-orders/${order_id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't send the offer", description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setOffering(null);
    }
  };

  const loading = colLoading || rulesLoading;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Tag className="h-3.5 w-3.5" /> Sell to a store
          </div>
          <h1 className="font-display text-3xl font-extrabold">Cash out cards from your collection</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Verified stores post standing buy prices. Pick a card, send it, get paid into your
            connected account when the store confirms it arrived.
          </p>

          {loading ? (
            <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
              <Store className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-3 font-display text-lg font-extrabold">No offers on your collection yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                No verified store is currently buying anything you own. Check back — buy lists change often.
              </p>
              <Button asChild variant="outline" className="mt-4 rounded-full"><Link to="/collection">View your collection</Link></Button>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Card</th>
                    <th className="px-4 py-2 text-right">Market</th>
                    <th className="px-4 py-2 text-right">Best offer</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ card, market, best }) => (
                    <tr key={card.dbId} className="border-t border-border">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-secondary">
                            <SmartImage src={card.imageUrl} alt={card.name} className="h-full w-full object-contain" fallback={null} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{card.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {card.set_id || "—"} · {card.condition.replace(/_/g, " ")}{card.is_graded && " · graded"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{gbp(market)}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="font-display font-extrabold tabular-nums text-gold">{gbp(best!.quote_gbp)}</div>
                        <div className="text-[11px] text-muted-foreground">{best!.store_name} · {best!.pct_of_market}%</div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" className="rounded-full" onClick={() => setPicked(card)}>Sell</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sell {picked?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choose which store to sell to. The store pays into escrow; you ship the card and get
            paid when they confirm it arrived. A small buylist fee is taken from your payout.
          </p>
          <div className="mt-2 space-y-2">
            {pickedOffers.map((o) => (
              <div key={o.buylist_id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <Link to={`/store/${o.store_slug}`} className="truncate font-semibold text-primary hover:underline">{o.store_name}</Link>
                  <div className="text-xs text-muted-foreground">pays {o.pct_of_market}% of market</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-extrabold tabular-nums text-gold">{gbp(o.quote_gbp)}</div>
                </div>
                <Button size="sm" className="rounded-full" disabled={offering === o.buylist_id} onClick={() => sendOffer(o)}>
                  {offering === o.buylist_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Offer"}
                </Button>
              </div>
            ))}
            {pickedOffers.length === 0 && (
              <p className="text-sm text-muted-foreground">No live offers for this card right now.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sell;
