import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TradeOffer from "@/components/trades/TradeOffer";
import GlassCard from "@/components/ui/custom/GlassCard";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/custom/Badge";
import { HandshakeIcon, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import CreateListingModal from "@/components/marketplace/CreateListingModal";
import { PokemonCard } from "@/services/pokemonTcgApi";

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
  const [isCreateListingOpen, setCreateListingOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateTrade = () => {
    setCreateListingOpen(true);
  };

  const onCreateListing = (cardOffered: PokemonCard, cardsWanted: string[], description: string) => {
    toast({
      title: "Trade Created!",
      description: "Your trade proposal has been created successfully.",
    });
    setCreateListingOpen(false);
  };

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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <GlassCard className="p-4 text-center">
              <div className="text-3xl font-bold mb-1">
                {activeTrades.length + completedTrades.length + declinedTrades.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Trades</div>
            </GlassCard>
            
            <GlassCard className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-500 mb-1">
                {activeTrades.filter(t => t.status === "pending").length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </GlassCard>
            
            <GlassCard className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500 mb-1">
                {activeTrades.filter(t => t.status === "accepted" || t.status === "shipped").length}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </GlassCard>
            
            <GlassCard className="p-4 text-center">
              <div className="text-3xl font-bold text-green-500 mb-1">
                {completedTrades.length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </GlassCard>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <Button className="gap-2" onClick={handleCreateTrade}>
              <Plus className="h-4 w-4" />
              Create New Trade
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          <Tabs defaultValue="active">
            <TabsList className="mb-6">
              <TabsTrigger value="active">
                Active
                <Badge variant="default" className="ml-2">
                  {activeTrades.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                <Badge variant="default" className="ml-2">
                  {completedTrades.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="declined">
                Declined
                <Badge variant="default" className="ml-2">
                  {declinedTrades.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-6">
              {activeTrades.length > 0 ? (
                activeTrades.map(trade => (
                  <TradeOffer key={trade.id} {...trade} />
                ))
              ) : (
                <GlassCard className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <HandshakeIcon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">No active trades</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any active trades at the moment. 
                    Start by creating a new trade proposal.
                  </p>
                  <Button onClick={handleCreateTrade}>Create New Trade</Button>
                </GlassCard>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-6">
              {completedTrades.length > 0 ? (
                completedTrades.map(trade => (
                  <TradeOffer key={trade.id} {...trade} />
                ))
              ) : (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">No completed trades</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't completed any trades yet. 
                    Complete one of your active trades to see it here.
                  </p>
                </GlassCard>
              )}
            </TabsContent>
            
            <TabsContent value="declined" className="space-y-6">
              {declinedTrades.length > 0 ? (
                declinedTrades.map(trade => (
                  <TradeOffer key={trade.id} {...trade} />
                ))
              ) : (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">No declined trades</h3>
                  <p className="text-muted-foreground">
                    You don't have any declined trades.
                  </p>
                </GlassCard>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />

      {isCreateListingOpen && (
        <CreateListingModal 
          isOpen={isCreateListingOpen}
          onClose={() => setCreateListingOpen(false)}
          selectedCard={selectedCard}
          onCreateListing={onCreateListing}
        />
      )}
    </div>
  );
};

export default Trades;
