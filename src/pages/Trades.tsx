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
      preview: "https://images.unsplash.com/photo-1605979257913-1704eb7b6246?q=80&w=1470&auto=format&fit=crop"
    },
    receiving: {
      count: 3,
      preview: "https://images.unsplash.com/photo-1607736703050-d0666c1d1278?q=80&w=1470&auto=format&fit=crop"
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
      preview: "https://images.unsplash.com/photo-1638075528746-8b5f9c2b6c9c?q=80&w=1480&auto=format&fit=crop"
    },
    receiving: {
      count: 1,
      preview: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1469&auto=format&fit=crop"
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
      preview: "https://images.unsplash.com/photo-1607736703050-d0666c1d1278?q=80&w=1470&auto=format&fit=crop"
    },
    receiving: {
      count: 2,
      preview: "https://images.unsplash.com/photo-1605979257913-1704eb7b6246?q=80&w=1470&auto=format&fit=crop"
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
      preview: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1469&auto=format&fit=crop"
    },
    receiving: {
      count: 2,
      preview: "https://images.unsplash.com/photo-1638075528746-8b5f9c2b6c9c?q=80&w=1480&auto=format&fit=crop"
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
      preview: "https://images.unsplash.com/photo-1606041011872-596597976b25?q=80&w=1374&auto=format&fit=crop"
    },
    receiving: {
      count: 1,
      preview: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=1470&auto=format&fit=crop"
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
      preview: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=1470&auto=format&fit=crop"
    },
    receiving: {
      count: 1,
      preview: "https://images.unsplash.com/photo-1606041011872-596597976b25?q=80&w=1374&auto=format&fit=crop"
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTradeProposalOpen, setIsTradeProposalOpen] = useState(false);
  const [selectedTargetCard, setSelectedTargetCard] = useState<CardItemProps | null>(null);
  const [searchParams] = useSearchParams();

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

  // Display zeros for stats
  const totalTrades = 0;
  const pendingCount = 0;
  const inProgressCount = 0;
  const completedCount = 0;
  const declinedCount = 0;

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
            totalTrades={totalTrades}
            pendingCount={pendingCount}
            inProgressCount={inProgressCount}
            completedCount={completedCount}
          />
          
          <TradeActions 
            isRefreshing={isRefreshing}
            setIsRefreshing={setIsRefreshing}
          />
          
          <TradeTabs 
            pendingCount={pendingCount}
            inProgressCount={inProgressCount}
            completedCount={completedCount}
            declinedCount={declinedCount}
            onCreateTrade={handleCreateTrade}
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
