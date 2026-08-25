import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, PackageOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TradeListing from "@/components/marketplace/TradeListing";
import TraderTrustBadge from "@/components/common/TraderTrustBadge";
import { CardItemProps } from "@/components/cards/CardItem";

interface ListingType {
  id: string;
  userId: string;
  username: string;
  cardOffered: CardItemProps;
  cardsWanted: string[];
  description: string;
  createdAt: Date;
  featured?: boolean;
  interestedCount: number;
  viewsCount: number;
  listingType: "trade" | "sale";
  askingPrice?: number;
  currency: string;
  sellerTotalTrades: number;
  sellerReputationScore: number;
}

const SellerStore = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["seller-store", userId],
    queryFn: async () => {
      const [{ data: profile }, { data: listings, error }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url, reputation_score, total_trades")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("marketplace_listings")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ]);
      if (error) throw error;
      return { profile, listings: listings ?? [] };
    },
    enabled: !!userId,
  });

  const listings: ListingType[] = (data?.listings ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    username: data?.profile?.display_name || data?.profile?.username || "Anonymous",
    cardOffered: {
      id: row.card_id,
      name: row.card_name,
      imageUrl: row.image_url || "",
      rarity: row.rarity || "Unknown",
      condition: row.condition,
      estimatedValue: "",
    },
    cardsWanted: row.trade_preferences ? [row.trade_preferences] : [],
    description: row.description || "",
    createdAt: new Date(row.created_at),
    featured: row.featured,
    interestedCount: row.interested_count || 0,
    viewsCount: row.views_count || 0,
    listingType: row.listing_type === "sale" ? "sale" : "trade",
    askingPrice: row.asking_price != null ? Number(row.asking_price) : undefined,
    currency: row.currency || "gbp",
    sellerTotalTrades: data?.profile?.total_trades || 0,
    sellerReputationScore: Number(data?.profile?.reputation_score || 0),
  }));

  const profile = data?.profile;
  const initials = (profile?.display_name || profile?.username || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/95">
      <Navbar />
      <main className="container py-8 flex-1">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading stall...</div>
        ) : !profile ? (
          <GlassCard className="p-8 text-center">
            <PackageOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-medium mb-2">Seller not found</h3>
          </GlassCard>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-8">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url} alt={profile.display_name || "Seller"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{profile.display_name || profile.username}'s Stall</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    {Number(profile.reputation_score || 0).toFixed(1)}
                  </span>
                  <span>{profile.total_trades || 0} trades</span>
                  <span>{listings.length} listing{listings.length === 1 ? "" : "s"}</span>
                  <TraderTrustBadge
                    totalTrades={profile.total_trades || 0}
                    reputationScore={Number(profile.reputation_score || 0)}
                  />
                </div>
              </div>
            </div>

            {listings.length > 0 ? (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {listings.map((listing) => (
                  <TradeListing
                    key={listing.id}
                    listing={listing}
                    onProposeTrade={() => navigate(`/trades?propose=true&listingId=${listing.id}`)}
                    featured={!!listing.featured}
                  />
                ))}
              </div>
            ) : (
              <GlassCard className="p-8 text-center">
                <PackageOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-medium mb-2">No active listings</h3>
                <p className="text-muted-foreground">This seller doesn't have anything listed right now.</p>
              </GlassCard>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SellerStore;
