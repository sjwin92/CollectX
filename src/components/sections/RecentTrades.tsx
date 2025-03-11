
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink } from "lucide-react";
import TradeOffer from "@/components/trades/TradeOffer";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Badge from "@/components/ui/custom/Badge";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";

const recentTrades = [
  {
    id: "t1",
    status: "completed" as const,
    date: "2 days ago",
    user: {
      id: "u1",
      name: "Alex Morgan",
      reputation: "trusted" as const
    },
    giving: {
      count: 2,
      preview: "https://images.pokemontcg.io/swsh4/25_hires.png"
    },
    receiving: {
      count: 3,
      preview: "https://images.pokemontcg.io/swsh1/7_hires.png"
    }
  },
  {
    id: "t2",
    status: "proposed" as const,
    date: "5 hours ago",
    user: {
      id: "u2",
      name: "Jordan Lee",
      reputation: "established" as const
    },
    giving: {
      count: 1,
      preview: "https://images.pokemontcg.io/swsh3/20_hires.png"
    },
    receiving: {
      count: 1,
      preview: "https://images.pokemontcg.io/sm12/222_hires.png"
    }
  }
];

const TradeProgressSteps = ({ status }: { status: string }) => {
  const getStatusStep = () => {
    switch (status) {
      case "proposed":
      case "pending":
        return 1;
      case "accepted":
      case "processing":
        return 2;
      case "escrowed":
        return 3;
      case "shipped":
        return 4;
      case "completed":
        return 5;
      case "declined":
      case "disputed":
      case "cancelled":
        return 0;
      default:
        return 0;
    }
  };

  const step = getStatusStep();

  return (
    <div className="mt-3 mb-1">
      <div className="relative flex justify-between w-full max-w-md mx-auto">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted transform -translate-y-1/2" />
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-primary transform -translate-y-1/2"
          style={{ width: `${(step / 5) * 100}%` }}
        />
        <div className="relative flex justify-between w-full">
          <div className="flex flex-col items-center">
            <div
              className={`h-4 w-4 rounded-full ${
                step >= 1 ? "bg-primary" : "bg-muted"
              } flex items-center justify-center text-white text-xs z-10`}
            />
            <span className="text-[10px] mt-1">Offered</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`h-4 w-4 rounded-full ${
                step >= 2 ? "bg-primary" : "bg-muted"
              } flex items-center justify-center text-white text-xs z-10`}
            />
            <span className="text-[10px] mt-1">Accepted</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`h-4 w-4 rounded-full ${
                step >= 3 ? "bg-primary" : "bg-muted"
              } flex items-center justify-center text-white text-xs z-10`}
            />
            <span className="text-[10px] mt-1">Escrowed</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`h-4 w-4 rounded-full ${
                step >= 4 ? "bg-primary" : "bg-muted"
              } flex items-center justify-center text-white text-xs z-10`}
            />
            <span className="text-[10px] mt-1">Shipped</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`h-4 w-4 rounded-full ${
                step >= 5 ? "bg-primary" : "bg-muted"
              } flex items-center justify-center text-white text-xs z-10`}
            />
            <span className="text-[10px] mt-1">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecentTrades = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSignedIn } = useUser();
  
  const handleViewTradeDetails = (tradeId: string) => {
    if (!isSignedIn) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to view trade details.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }
    
    // This is the key change - navigate to the correct trade details page
    navigate(`/trades/${tradeId}`);
  };

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
          {recentTrades.map((trade) => (
            <Card key={trade.id} className="overflow-hidden">
              <CardContent className="p-4">
                <TradeOffer key={trade.id} {...trade} />
                <Separator className="my-3" />
                <div className="flex items-center justify-between px-1">
                  <div className="text-sm font-medium">Trade Progress</div>
                  <Badge 
                    variant={
                      trade.status === "completed" ? "success" : 
                      trade.status === "proposed" ? "warning" : "info"
                    }
                  >
                    {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                  </Badge>
                </div>
                <TradeProgressSteps status={trade.status} />
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto flex items-center gap-1"
                  onClick={() => handleViewTradeDetails(trade.id)}
                >
                  View Details <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
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
