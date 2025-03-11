
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TradeOffer from "@/components/trades/TradeOffer";

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

const RecentTrades = () => {
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
            <TradeOffer key={trade.id} {...trade} />
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
