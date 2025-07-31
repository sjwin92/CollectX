
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeftRight, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReputationBadge from './ReputationBadge';
import { getConsistentCardImageUrl } from '@/services/api/cardImageService';
import GlassCard from '@/components/ui/custom/GlassCard';

interface LiveTradeData {
  id: string;
  status: "completed" | "proposed" | "accepted" | "shipped";
  date: string;
  user: {
    id: string;
    name: string;
    reputation: "trusted" | "established" | "new";
  };
  giving: {
    count: number;
    cardId: string;
    cardName: string;
  };
  receiving: {
    count: number;
    cardId: string;
    cardName: string;
  };
}

const LiveTradeFeed = () => {
  // No trades yet - fresh platform
  const liveTradeData: LiveTradeData[] = [];

  // No need for interval when there are no trades

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Live Trading Activity</h2>
          <p className="text-muted-foreground">
            See the latest successful trades happening on the platform in real-time
          </p>
        </div>
        <Button variant="ghost" className="hidden md:flex" asChild>
          <Link to="/trades" className="flex items-center gap-1">
            All Trades <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {liveTradeData.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="text-muted-foreground mb-4">
            <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Trades Yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to complete a trade and show up in our live feed!
          </p>
          <Button variant="outline" asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
        </GlassCard>
      ) : (
        <div>
          {/* Trade feed content would go here when trades exist */}
        </div>
      )}

      <div className="text-center md:hidden">
        <Button asChild>
          <Link to="/trades">View All Trades</Link>
        </Button>
      </div>
    </div>
  );
};

export default LiveTradeFeed;
