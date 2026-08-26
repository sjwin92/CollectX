import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SmartImage } from "@/components/common/SmartImage";
import { Skeleton } from "@/components/ui/skeleton";
import TraderTrustBadge from "@/components/common/TraderTrustBadge";
import CardTypeBadge from "@/components/pokemon/CardTypeBadge";
import CardPrice from "@/components/pokemon/CardPrice";
import { conditionTone } from "@/components/marketplace/listing/conditionTone";
import { useCardPrices } from "@/hooks/useCardPrices";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getMarketplaceListingById } from "@/services/supabaseMarketplaceService";
import { createCheckoutSession } from "@/services/supabaseMarketplaceService";
import { proposeTrade } from "@/services/tradeService";
import { getTradableCards, type ExtendedCardItemWithDB } from "@/services/supabaseCollectionService";
import { ArrowLeft, ArrowRightLeft, Loader2, ShoppingBag, ShieldCheck } from "lucide-react";

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();

  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [buying, setBuying] = useState(false);

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => (id ? getMarketplaceListingById(id) : null),
    enabled: !!id,
  });

  const { data: seller } = useQuery({
    queryKey: ["listing-seller", listing?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, total_trades, reputation_score")
        .eq("user_id", listing!.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!listing?.user_id,
  });

  const cardId = listing?.card_id as string | undefined;
  const priceMap = useCardPrices(cardId ? [cardId] : []);

  const isSale = listing?.listing_type === "sale";
  const isOwn = !!user && !!listing && user.id === listing.user_id;

  const { data: tradable = [], isLoading: tradableLoading } = useQuery<ExtendedCardItemWithDB[]>({
    queryKey: ["tradable-cards", user?.id],
    queryFn: getTradableCards,
    enabled: !!user && !!listing && !isSale && !isOwn,
  });

  const toggle = (uid: string) =>
    setSelectedIds((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));

  const handleSend = async () => {
    if (!listing || selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      await proposeTrade(listing.id, selectedIds, message.trim() || undefined);
      toast({ title: "Trade proposal sent", description: "You'll hear back from the owner soon." });
      navigate("/trades");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't send proposal",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuy = async () => {
    if (!listing) return;
    setBuying(true);
    try {
      const url = await createCheckoutSession(listing.id);
      window.location.href = url;
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't start checkout",
        description: err instanceof Error ? err.message : "This listing may no longer be available.",
      });
      setBuying(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="relative container flex-1 pb-16 pt-24">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-[320px_1fr]">
            <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        ) : isError || !listing ? (
          <div className="py-16 text-center">
            <h1 className="mb-2 text-2xl font-bold">Listing not found</h1>
            <p className="mb-6 text-muted-foreground">It may have been withdrawn or already traded.</p>
            <Button asChild className="rounded-full">
              <Link to="/marketplace">Back to marketplace</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-[320px_1fr]">
            {/* Listing summary */}
            <div className="anim-rise">
              <div className="pedestal group relative overflow-hidden rounded-2xl border border-border bg-card p-4">
                <span className="holo" aria-hidden />
                {listing.image_url ? (
                  <SmartImage
                    src={listing.image_url}
                    alt={listing.card_name}
                    className="mx-auto w-full max-w-[260px] rounded-lg"
                    fallback={null}
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              <h1 className="mt-4 font-display text-2xl font-extrabold leading-tight">
                {listing.card_name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <CardTypeBadge cardId={cardId} />
                {listing.condition && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-[3px] text-[10px] font-semibold ${conditionTone(
                      listing.condition,
                    )}`}
                  >
                    {listing.condition}
                  </span>
                )}
                {listing.rarity && (
                  <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-[3px] text-[10px] font-semibold text-muted-foreground">
                    {listing.rarity}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  @{seller?.display_name || seller?.username || "seller"}
                </span>
                <TraderTrustBadge
                  totalTrades={seller?.total_trades ?? 0}
                  reputationScore={Number(seller?.reputation_score ?? 0)}
                />
              </div>

              <div className="mt-4 flex items-end justify-between rounded-xl border border-border bg-secondary/30 p-3">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {isSale ? "Asking price" : "Market price"}
                  </span>
                  {isSale ? (
                    <span className="font-display text-lg font-extrabold text-gold tabular-nums">
                      {(listing.currency || "GBP").toUpperCase()}{" "}
                      {Number(listing.asking_price ?? 0).toFixed(2)}
                    </span>
                  ) : (
                    <span className="font-display text-lg font-extrabold text-gold tabular-nums">
                      {priceMap.get(cardId ?? "") != null
                        ? `£${priceMap.get(cardId ?? "")!.toFixed(2)}`
                        : "—"}
                    </span>
                  )}
                </div>
                <Link to={`/card/${cardId}`} className="text-xs text-primary hover:underline">
                  View card
                </Link>
              </div>

              {listing.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {listing.description}
                </p>
              )}
            </div>

            {/* Build your offer / buy */}
            <div className="anim-rise" style={{ animationDelay: "120ms" }}>
              {isOwn ? (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-display text-lg font-extrabold">This is your listing</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Manage it from the marketplace — you can withdraw it or wait for offers.
                  </p>
                  <Button asChild className="mt-4 rounded-full">
                    <Link to="/marketplace">Back to marketplace</Link>
                  </Button>
                </div>
              ) : isSale ? (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-display text-lg font-extrabold">Buy this card</h2>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Payment is held until you confirm delivery.
                  </p>
                  <Button
                    onClick={handleBuy}
                    disabled={buying}
                    className="mt-4 rounded-full bg-gold px-5 font-semibold text-black hover:bg-gold/90"
                  >
                    <ShoppingBag className="mr-1.5 h-4 w-4" />
                    {buying ? "Redirecting…" : "Buy now"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-display text-lg font-extrabold">Build your offer</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick cards you've marked <span className="font-medium">for trade</span> to offer for{" "}
                    {listing.card_name}.
                  </p>

                  {listing.trade_preferences && (
                    <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                      <span className="font-medium">Owner wants:</span> {listing.trade_preferences}
                    </div>
                  )}

                  <div className="mt-4">
                    {!user ? (
                      <p className="py-6 text-sm text-muted-foreground">Please sign in to propose a trade.</p>
                    ) : tradableLoading ? (
                      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading your for-trade cards…
                      </div>
                    ) : tradable.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                        You have no cards marked <span className="font-medium">for trade</span> yet. Enable
                        "For trade" on a card in your collection first.
                      </div>
                    ) : (
                      <div className="grid max-h-[360px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                        {tradable.map((c) => {
                          const uid = (c.dbId as string) || "";
                          if (!uid) return null;
                          const selected = selectedIds.includes(uid);
                          return (
                            <button
                              key={uid}
                              type="button"
                              onClick={() => toggle(uid)}
                              className={`rounded-md border p-1 text-left transition-all ${
                                selected
                                  ? "border-primary ring-2 ring-primary/40"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <SmartImage
                                src={c.imageUrl}
                                alt={c.name}
                                className="aspect-[3/4] w-full rounded object-cover"
                                fallback={null}
                              />
                              <div className="mt-1 truncate text-xs">{c.name}</div>
                              {c.condition && (
                                <div className="truncate text-[10px] text-muted-foreground">{c.condition}</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium">Message (optional)</label>
                    <Textarea
                      placeholder="Add a note about your offer…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-20 rounded-xl"
                    />
                  </div>

                  <Button
                    onClick={handleSend}
                    disabled={selectedIds.length === 0 || submitting}
                    className="mt-4 rounded-full px-5 font-semibold"
                  >
                    {submitting ? (
                      <>Sending…<Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                    ) : (
                      <>
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Send proposal ({selectedIds.length})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ListingDetail;
