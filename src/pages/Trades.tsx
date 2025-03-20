import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";
import TradeStats from "@/components/trades/TradeStats";
import TradeActions from "@/components/trades/TradeActions";
import TradeTabs from "@/components/trades/TradeTabs";

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

const Trades = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCreateTrade = () => {
    toast.info("This feature is coming soon!");
  };

  // Display correct stats as specified
  const totalTrades = 6;
  const pendingCount = 1;
  const inProgressCount = 2;
  const completedCount = 2;

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
            declinedCount={declinedTrades.length}
            onCreateTrade={handleCreateTrade}
          />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Trades;
