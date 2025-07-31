import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";
import TradeStats from "@/components/trades/TradeStats";
import TradeActions from "@/components/trades/TradeActions";
import TradeTabs from "@/components/trades/TradeTabs";
import TradeProposalForm from "@/components/marketplace/TradeProposalForm";
import { CardItemProps } from "@/components/cards/CardItem";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";

type TradeStatus = "pending" | "accepted" | "shipped" | "completed" | "declined";
type ReputationType = "trusted" | "established" | "new";

interface Trade {
  id: string;
  status: TradeStatus;
  date: string;
  user: {
    id: string;
    name: string;
    reputation: ReputationType;
  };
  giving: {
    count: number;
    preview: string;
  };
  receiving: {
    count: number;
    preview: string;
  };
  message?: string;
  offeredCards?: any[];
  targetCard?: CardItemProps;
}

// Placeholder trade data (keeping for reference, but not using directly)
const activeTrades = [
  {
    id: "t1",
    status: "pending" as const,
    date: "2 hours ago",
    user: {
      id: "u1",
      name: "Alex Morgan",
      reputation: "trusted" as const
    },
    giving: {
      count: 2,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    },
    receiving: {
      count: 3,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    }
  },
  {
    id: "t2",
    status: "accepted" as const,
    date: "1 day ago",
    user: {
      id: "u2",
      name: "Jordan Lee",
      reputation: "established" as const
    },
    giving: {
      count: 1,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    },
    receiving: {
      count: 1,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    }
  },
  {
    id: "t3",
    status: "shipped" as const,
    date: "3 days ago",
    user: {
      id: "u3",
      name: "Taylor Kim",
      reputation: "new" as const
    },
    giving: {
      count: 1,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    },
    receiving: {
      count: 2,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    }
  }
];

const completedTrades = [
  {
    id: "t4",
    status: "completed" as const,
    date: "1 week ago",
    user: {
      id: "u4",
      name: "Jamie Rivera",
      reputation: "trusted" as const
    },
    giving: {
      count: 4,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    },
    receiving: {
      count: 2,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    }
  },
  {
    id: "t5",
    status: "completed" as const,
    date: "2 weeks ago",
    user: {
      id: "u5",
      name: "Casey Zhang",
      reputation: "established" as const
    },
    giving: {
      count: 1,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    },
    receiving: {
      count: 1,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    }
  }
];

const declinedTrades = [
  {
    id: "t6",
    status: "declined" as const,
    date: "3 days ago",
    user: {
      id: "u6",
      name: "Riley Johnson",
      reputation: "new" as const
    },
    giving: {
      count: 1,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    },
    receiving: {
      count: 1,
      preview: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    }
  }
];

// Mock marketplace listings - in a real app this would come from your database
const MARKETPLACE_LISTINGS = [
  {
    id: "featured-1",
    cardOffered: {
      id: "base1-4",
      name: "Charizard Base Set",
      imageUrl: "https://images.pokemontcg.io/base1/4.png",
      rarity: "Holo Rare",
      condition: "Near Mint",
      estimatedValue: "$500"
    }
  },
  {
    id: "featured-2", 
    cardOffered: {
      id: "sm12-190",
      name: "Mewtwo & Mew GX (Rainbow)",
      imageUrl: "https://images.pokemontcg.io/sm12/190.png",
      rarity: "Ultra Rare", 
      condition: "Mint",
      estimatedValue: "$120"
    }
  }
];

const Trades = () => {
  const { user } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTradeProposalOpen, setIsTradeProposalOpen] = useState(false);
  const [selectedTargetCard, setSelectedTargetCard] = useState<CardItemProps | null>(null);
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  
  // Real trades state from database
  const [userTrades, setUserTrades] = useState<any[]>([]);
  const [tradeStats, setTradeStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    declined: 0
  });

  // Load real trades from database
  useEffect(() => {
    if (user) {
      loadUserTrades();
    }
  }, [user]);

  const loadUserTrades = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select(`
          *,
          initiator_profile:profiles!trades_initiator_user_id_fkey(display_name, username, avatar_url),
          recipient_profile:profiles!trades_recipient_user_id_fkey(display_name, username, avatar_url)
        `)
        .or(`initiator_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading trades:', error);
        return;
      }

      setUserTrades(trades || []);
      
      // Calculate stats
      const stats = {
        total: trades?.length || 0,
        pending: trades?.filter(t => t.status === 'proposed').length || 0,
        inProgress: trades?.filter(t => ['accepted', 'processing', 'shipped'].includes(t.status)).length || 0,
        completed: trades?.filter(t => t.status === 'completed').length || 0,
        declined: trades?.filter(t => t.status === 'declined').length || 0
      };
      
      setTradeStats(stats);
    } catch (error) {
      console.error('Error loading trades:', error);
      toast.error('Failed to load trades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const shouldPropose = searchParams.get('propose') === 'true';
    const listingId = searchParams.get('listingId');
    
    if (shouldPropose && listingId) {
      const listing = MARKETPLACE_LISTINGS.find(l => l.id === listingId);
      if (listing) {
        setSelectedTargetCard(listing.cardOffered);
        setIsTradeProposalOpen(true);
      }
    }
  }, [searchParams]);

  const handleCreateTrade = () => {
    // Navigate to marketplace to browse and propose trades
    window.location.href = '/marketplace';
  };

  const handleSubmitProposal = (message: string, offeredCards: any[], paymentCompleted?: boolean) => {
    console.log('Trade proposal submitted:', { message, offeredCards, paymentCompleted });
    
    // Create new trade entry
    const newTrade = {
      id: `t-${Date.now()}`,
      status: "pending" as const,
      date: "just now",
      user: {
        id: "marketplace-user",
        name: "Marketplace Trader",
        reputation: "new" as const
      },
      giving: {
        count: offeredCards.length,
        preview: offeredCards[0]?.images?.small || "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
      },
      receiving: {
        count: 1,
        preview: selectedTargetCard?.imageUrl || "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
      },
      message,
      offeredCards,
      targetCard: selectedTargetCard
    };
    
    // Add to trades list
    setUserTrades(prev => [newTrade, ...prev]);
    
    toast.success('Trade proposal sent successfully!');
    setIsTradeProposalOpen(false);
    
    // Clear URL parameters
    window.history.replaceState({}, '', '/trades');
  };

  const handleCloseProposal = () => {
    setIsTradeProposalOpen(false);
    // Clear URL parameters
    window.history.replaceState({}, '', '/trades');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading your trades...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Trades</h1>
            <p className="text-muted-foreground">
              Manage your trade proposals and track active trades
            </p>
          </div>
          
          <TradeStats 
            totalTrades={tradeStats.total}
            pendingCount={tradeStats.pending}
            inProgressCount={tradeStats.inProgress}
            completedCount={tradeStats.completed}
          />
          
          <TradeActions 
            isRefreshing={isRefreshing}
            setIsRefreshing={setIsRefreshing}
            onRefresh={loadUserTrades}
          />
          
          <TradeTabs 
            pendingCount={tradeStats.pending}
            inProgressCount={tradeStats.inProgress}
            completedCount={tradeStats.completed}
            declinedCount={tradeStats.declined}
            onCreateTrade={handleCreateTrade}
            trades={userTrades}
            currentUserId={user?.id}
          />
        </div>
      </main>
      
      <Footer />
      
      {isTradeProposalOpen && selectedTargetCard && (
        <TradeProposalForm
          isOpen={isTradeProposalOpen}
          onClose={handleCloseProposal}
          targetCard={selectedTargetCard}
          onSubmitProposal={handleSubmitProposal}
        />
      )}
    </div>
  );
};

export default Trades;
