import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeftRight, Clock, CheckCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import GlassCard from '@/components/ui/custom/GlassCard';
import { SmartImage } from '@/components/common/SmartImage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  completed: { label: 'Completed', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-500/20 text-green-400' },
  shipped:   { label: 'Shipped',   icon: <Package className="h-3 w-3" />,     color: 'bg-yellow-500/20 text-yellow-400' },
  accepted:  { label: 'Accepted',  icon: <CheckCircle className="h-3 w-3" />, color: 'bg-primary/20 text-primary' },
  proposed:  { label: 'Proposed',  icon: <Clock className="h-3 w-3" />,       color: 'bg-muted text-muted-foreground' },
};

interface TradeCard {
  id?: string;
  card_id?: string;
  name?: string;
  card_name?: string;
  imageUrl?: string;
  image_url?: string;
  quantity?: number;
}

// The image stored on the trade (a scrydex URL for most sets, incl. the Mega
// Evolution sets pokemontcg.io only has card-backs for) is the primary source;
// pokemontcg.io derived from the id is the fallback for older rows with none.
const catalogueImg = (id?: string) =>
  id && id.includes('-') ? `https://images.pokemontcg.io/${id.replace('-', '/')}.png` : undefined;

const cardList = (raw: unknown): TradeCard[] => {
  if (Array.isArray(raw)) return raw as TradeCard[];
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
};

const MiniCards = ({ cards, align }: { cards: TradeCard[]; align: 'start' | 'end' }) => {
  if (cards.length === 0) {
    return <span className="text-xs text-muted-foreground">no cards</span>;
  }
  const shown = cards.slice(0, 3);
  const extra = cards.length - shown.length;
  return (
    <div className={`flex items-center gap-1 ${align === 'end' ? 'justify-end' : ''}`}>
      {shown.map((c, i) => {
        const id = c.id || c.card_id;
        const name = c.card_name || c.name || 'Card';
        const inner = (
          <SmartImage
            src={c.imageUrl || c.image_url || catalogueImg(id)}
            fallbackSrc={catalogueImg(id)}
            alt={name}
            className="h-14 w-10 rounded-[3px] object-cover"
            wrapperClassName="h-14 w-10 rounded-[3px] overflow-hidden ring-1 ring-white/10 bg-secondary"
            fallback={
              <span className="flex h-full w-full items-center justify-center px-0.5 text-center text-[8px] leading-tight text-muted-foreground">
                {name}
              </span>
            }
          />
        );
        return id ? (
          <Link key={`${id}-${i}`} to={`/card/${id}`} title={name} className="shrink-0 transition-transform hover:-translate-y-0.5">
            {inner}
          </Link>
        ) : (
          <div key={i} className="shrink-0" title={name}>{inner}</div>
        );
      })}
      {extra > 0 && (
        <span className="text-xs font-medium text-muted-foreground">+{extra}</span>
      )}
    </div>
  );
};

const LiveTradeFeed = () => {
  const { data: trades = [] } = useQuery({
    queryKey: ['live_trade_feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('id, status, created_at, initiator_cards, recipient_cards, initiator_user_id, recipient_user_id')
        .in('status', ['completed', 'shipped', 'accepted', 'proposed'])
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) return [];
      const rows = data || [];
      const ids = Array.from(new Set(
        rows.flatMap((t: any) => [t.initiator_user_id, t.recipient_user_id]).filter(Boolean),
      ));
      let profileMap = new Map<string, any>();
      if (ids.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', ids);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }
      return rows.map((t: any) => ({
        ...t,
        initiator: profileMap.get(t.initiator_user_id) || null,
        recipient: profileMap.get(t.recipient_user_id) || null,
      }));
    },
    refetchInterval: 60_000,
  });

  const getName = (profile: any) => profile?.display_name || profile?.username || 'Trader';
  const getInitials = (profile: any) => getName(profile).substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Recent Trade Activity</h2>
          <p className="text-muted-foreground">Real card-for-card trades happening on CollectX.</p>
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
          <p className="text-muted-foreground mb-4">Propose or accept a trade and it'll appear here.</p>
          <Button variant="outline" asChild>
            <Link to="/trades">Browse trades</Link>
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(trades as any[]).map((trade) => {
            const cfg = statusConfig[trade.status] || statusConfig.proposed;
            const initiatorCards = cardList(trade.initiator_cards);
            const recipientCards = cardList(trade.recipient_cards);
            return (
              <GlassCard key={trade.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={trade.initiator?.avatar_url || undefined} alt={getName(trade.initiator)} />
                      <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                        {getInitials(trade.initiator)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{getName(trade.initiator)}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0 justify-end">
                    <span className="text-sm font-medium truncate">{getName(trade.recipient)}</span>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={trade.recipient?.avatar_url || undefined} alt={getName(trade.recipient)} />
                      <AvatarFallback className="bg-secondary text-[10px]">
                        {getInitials(trade.recipient)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0"><MiniCards cards={initiatorCards} align="start" /></div>
                  <ArrowLeftRight className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0"><MiniCards cards={recipientCards} align="end" /></div>
                </div>

                <div className="flex items-center justify-between">
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
