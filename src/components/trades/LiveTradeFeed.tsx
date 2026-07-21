
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeftRight, Clock, CheckCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import GlassCard from '@/components/ui/custom/GlassCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  completed: { label: 'Completed', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-500/20 text-green-400' },
  shipped:   { label: 'Shipped',   icon: <Package className="h-3 w-3" />,     color: 'bg-yellow-500/20 text-yellow-400' },
  accepted:  { label: 'Accepted',  icon: <CheckCircle className="h-3 w-3" />, color: 'bg-primary/20 text-primary' },
  proposed:  { label: 'Proposed',  icon: <Clock className="h-3 w-3" />,       color: 'bg-muted text-muted-foreground' },
};

const LiveTradeFeed = () => {
  const { data: trades = [] } = useQuery({
    queryKey: ['live_trade_feed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trades')
        .select(`
          id, status, created_at, initiator_cards, recipient_cards,
          initiator:profiles!trades_initiator_user_id_fkey(display_name, username),
          recipient:profiles!trades_recipient_user_id_fkey(display_name, username)
        `)
        .in('status', ['completed', 'shipped', 'accepted', 'proposed'])
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const getName = (profile: any) =>
    profile?.display_name || profile?.username || 'Trader';

  const getInitials = (profile: any) =>
    getName(profile).substring(0, 2).toUpperCase();

  const getCardSummary = (cards: any) => {
    if (!cards) return 'cards';
    const arr = Array.isArray(cards) ? cards : [];
    if (arr.length === 0) return 'cards';
    const first = arr[0]?.name || arr[0]?.card_name || 'card';
    return arr.length > 1 ? `${first} + ${arr.length - 1} more` : first;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Recent Trade Activity</h2>
          <p className="text-muted-foreground">
            Your latest trades appear here when you’re signed in.
          </p>
        </div>
        <Button variant="ghost" className="hidden md:flex" asChild>
          <Link to="/trades" className="flex items-center gap-1">
            All Trades <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {trades.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">No trade activity to show yet</h3>
          <p className="text-muted-foreground mb-4">
            Sign in and propose or accept a trade to see it here.
          </p>
          <Button variant="outline" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </GlassCard>

      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(trades as any[]).map((trade) => {
            const cfg = statusConfig[trade.status] || statusConfig.proposed;
            return (
              <GlassCard key={trade.id} className="p-4 flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {getInitials(trade.initiator)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getName(trade.initiator)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getCardSummary(trade.initiator_cards)}
                    </p>
                  </div>
                </div>

                <ArrowLeftRight className="h-4 w-4 text-primary shrink-0" />

                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <div className="min-w-0 text-right">
                    <p className="text-sm font-medium truncate">
                      {getName(trade.recipient)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getCardSummary(trade.recipient_cards)}
                    </p>
                  </div>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-secondary text-xs">
                      {getInitials(trade.recipient)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1">
                  <Badge className={`text-xs flex items-center gap-1 ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(trade.created_at), { addSuffix: true })}
                  </span>
                </div>
              </GlassCard>
            );
          })}
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
