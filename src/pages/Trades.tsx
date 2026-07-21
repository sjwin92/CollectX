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
import { proposeTrade } from "@/services/tradeService";
import { useUser } from "@/hooks/useUser";

type TradeStatus = "proposed" | "accepted" | "shipped" | "completed" | "cancelled" | "disputed";
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
    cancelled: 0
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
        inProgress: trades?.filter(t => ['accepted', 'shipped', 'disputed'].includes(t.status)).length || 0,
        completed: trades?.filter(t => t.status === 'completed').length || 0,
        cancelled: trades?.filter(t => t.status === 'cancelled').length || 0
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
      supabase
        .from('marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .single()
        .then(({ data }) => {
          if (data) {
            setSelectedTargetCard({
              id: data.id, // listing id — resolved back to listing on submit
              name: data.card_name,
              imageUrl: data.image_url,
              rarity: data.rarity || '',
              condition: data.condition || '',
              estimatedValue: data.asking_price ? `£${data.asking_price}` : '0',
            });
            setIsTradeProposalOpen(true);
          }
        });
    }
  }, [searchParams]);

  const handleCreateTrade = () => {
    // Navigate to marketplace to browse and propose trades
    window.location.href = '/marketplace';
  };

  const handleSubmitProposal = async (message: string, selectedUserCardIds: string[]) => {
    if (!selectedTargetCard || !user) return;
    if (!selectedUserCardIds?.length) {
      toast.error('Select at least one card to offer.');
      return;
    }
    try {
      // selectedTargetCard.id here holds the listing id (see effect above)
      await proposeTrade(selectedTargetCard.id, selectedUserCardIds, message);
      toast.success('Trade proposal sent!');
      setIsTradeProposalOpen(false);
      window.history.replaceState({}, '', '/trades');
      loadUserTrades();
    } catch (err: any) {
      console.error('Trade creation failed:', err);
      toast.error(err?.message || 'Failed to send trade proposal.');
    }
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
            cancelledCount={tradeStats.cancelled}
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
