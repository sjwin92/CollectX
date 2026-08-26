import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Globe, MapPin, PackageOpen } from "lucide-react";
import { SmartImage } from "@/components/common/SmartImage";
import { supabase } from "@/integrations/supabase/client";
import { getStoreBySlug } from "@/services/storeService";
import { getStoreShelf } from "@/services/storeOrderService";
import StoreShelfCard from "@/components/store/StoreShelfCard";
import TradeListing from "@/components/marketplace/TradeListing";
import type { CardItemProps } from "@/components/cards/CardItem";

const StorePublic: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: store, isLoading } = useQuery({
    queryKey: ["store-public", slug],
    queryFn: () => (slug ? getStoreBySlug(slug) : null),
    enabled: !!slug,
  });

  const { data: shelf = [] } = useQuery({
    queryKey: ["store-public-shelf", store?.user_id],
    enabled: !!store?.user_id,
    queryFn: () => getStoreShelf(store!.user_id),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["store-public-listings", store?.user_id],
    enabled: !!store?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("user_id", store!.user_id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        userId: r.user_id as string,
        username: store!.name,
        cardOffered: {
          id: r.card_id as string,
          name: r.card_name as string,
          imageUrl: (r.image_url as string) || "",
          rarity: (r.rarity as string) || "Unknown",
          condition: r.condition as string,
          estimatedValue: "",
        } as CardItemProps,
        cardsWanted: [] as string[],
        description: (r.description as string) || "",
        createdAt: new Date(r.created_at as string),
        featured: r.featured as boolean,
        listingType: r.listing_type === "sale" ? ("sale" as const) : ("trade" as const),
        askingPrice: r.asking_price != null ? Number(r.asking_price) : undefined,
        currency: (r.currency as string) || "gbp",
        sellerTotalTrades: 0,
        sellerReputationScore: 0,
      }));
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-4xl">
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-2xl" />
          ) : !store ? (
            <div className="py-16 text-center">
              <h1 className="font-display text-2xl font-extrabold">Store not found</h1>
              <p className="mt-2 text-muted-foreground">This storefront isn't live.</p>
              <Button asChild className="mt-6 rounded-full">
                <Link to="/marketplace">Back to marketplace</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {store.banner_url && (
                  <SmartImage src={store.banner_url} alt="" className="h-40 w-full object-cover" fallback={null} />
                )}
                <div className="flex flex-wrap items-start gap-4 p-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
                    {store.logo_url ? (
                      <SmartImage src={store.logo_url} alt={store.name} className="h-full w-full object-cover" fallback={null} />
                    ) : (
                      <PackageOpen className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-2xl font-extrabold leading-tight">{store.name}</h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified store
                      </span>
                      {(store.subscription_tier === "growth" || store.subscription_tier === "pro") && (
                        <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-gold">
                          {store.subscription_tier}
                        </span>
                      )}
                    </div>
                    {store.bio && <p className="mt-1.5 text-sm text-muted-foreground">{store.bio}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {store.location?.city && (
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {store.location.city}</span>
                      )}
                      {store.website && (
                        <a
                          href={store.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Globe className="h-3.5 w-3.5" /> {store.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="mt-8 font-display text-lg font-extrabold">
                In stock <span className="text-sm font-semibold text-muted-foreground">({shelf.length})</span>
              </h2>
              {shelf.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No stock listed right now.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {shelf.map((item) => (
                    <StoreShelfCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {listings.length > 0 && (
                <>
                  <h2 className="mt-10 font-display text-lg font-extrabold">
                    Also from this seller <span className="text-sm font-semibold text-muted-foreground">({listings.length})</span>
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {listings.map((l) => (
                      <TradeListing key={l.id} listing={l} onProposeTrade={() => undefined} featured={!!l.featured} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StorePublic;
