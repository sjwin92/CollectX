
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TradeOffer from "@/components/trades/TradeOffer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Function to fetch recent trades
const fetchRecentTrades = async () => {
  // Use a simpler query that doesn't try to join to users directly
  const { data, error } = await supabase
    .from('trade_proposals')
    .select(`
      id,
      status,
      created_at,
      updated_at,
      initiator_id,
      recipient_id,
      trade_cards(
        id,
        user_id,
        condition,
        estimated_value,
        currency,
        pokemon_cards_cache(id, name, data, image_url)
      )
    `)
    .order('updated_at', { ascending: false })
    .limit(4);

  if (error) {
    throw new Error(error.message);
  }

  // Process the data to match the expected format for TradeOffer
  return data.map(trade => {
    // Group cards by user_id
    const cardsByUser = trade.trade_cards.reduce((acc, card) => {
      const userId = card.user_id;
      if (!acc[userId]) acc[userId] = [];
      acc[userId].push(card);
      return acc;
    }, {});

    // Find initiator and recipient cards
    const userIds = Object.keys(cardsByUser);
    const initiatorId = trade.initiator_id;
    const recipientId = trade.recipient_id;

    // For demo purposes, use placeholder usernames
    const usernames = {
      [initiatorId]: "User " + initiatorId?.substring(0, 4),
      [recipientId]: recipientId ? "User " + recipientId?.substring(0, 4) : "Unknown"
    };

    // Get preview image and count for each side
    const getPreviewInfo = (userId) => {
      if (!userId || !cardsByUser[userId] || cardsByUser[userId].length === 0) {
        return { 
          count: 0, 
          preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg" 
        };
      }

      const cards = cardsByUser[userId];
      return {
        count: cards.length,
        preview: cards[0].pokemon_cards_cache.image_url || "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
      };
    };

    // Format relative time
    const formatRelativeTime = (timestamp) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    };

    return {
      id: trade.id,
      status: trade.status,
      date: formatRelativeTime(trade.updated_at),
      user: {
        id: initiatorId || "unknown",
        name: usernames[initiatorId] || "Unknown User",
        reputation: "established"
      },
      giving: getPreviewInfo(initiatorId),
      receiving: getPreviewInfo(recipientId)
    };
  });
};

const RecentTrades = () => {
  const { toast } = useToast();
  const [trades, setTrades] = useState([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['recentTrades'],
    queryFn: fetchRecentTrades,
    staleTime: 60 * 1000, // 1 minute
  });

  useEffect(() => {
    if (data) {
      setTrades(data);
    }
  }, [data]);

  useEffect(() => {
    // Set up a Supabase realtime subscription for trade updates
    const channel = supabase
      .channel('public:trade_proposals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trade_proposals'
      }, (payload) => {
        // Refresh the trades data
        fetchRecentTrades()
          .then(newTrades => setTrades(newTrades))
          .catch(err => console.error("Error refreshing trades:", err));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (error) {
    toast({
      title: "Error loading trades",
      description: error.message,
      variant: "destructive"
    });
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Recent Trades</h2>
            <p className="text-muted-foreground">
              See the latest successful trades happening on the platform
            </p>
          </div>
          <Button variant="ghost" className="hidden md:flex" asChild>
            <Link to="/trades" className="flex items-center gap-1">
              All Trades <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            // Show loading skeletons
            Array(4).fill(0).map((_, index) => (
              <div key={`skeleton-${index}`} className="rounded-lg border bg-card p-4">
                <div className="flex justify-between items-start mb-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="flex gap-4 mb-4">
                  <Skeleton className="h-16 w-16 rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full mt-4" />
              </div>
            ))
          ) : trades && trades.length > 0 ? (
            trades.map((trade) => (
              <TradeOffer 
                key={trade.id} 
                {...trade} 
                showProgressBar={true}
              />
            ))
          ) : (
            <div className="col-span-2 text-center py-8">
              <p className="text-muted-foreground">No recent trades found</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center md:hidden">
          <Button asChild>
            <Link to="/trades">View All Trades</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default RecentTrades;
