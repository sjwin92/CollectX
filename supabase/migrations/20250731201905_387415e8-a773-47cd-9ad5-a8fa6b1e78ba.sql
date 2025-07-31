-- Create trades table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  initiator_user_id UUID NOT NULL,
  recipient_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined', 'processing', 'shipped', 'completed', 'cancelled', 'disputed')),
  title TEXT,
  description TEXT,
  initiator_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipient_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  initiator_value NUMERIC DEFAULT 0,
  recipient_value NUMERIC DEFAULT 0,
  shipping_address TEXT,
  tracking_number TEXT,
  escrow_required BOOLEAN DEFAULT false,
  escrow_amount NUMERIC DEFAULT 0,
  escrow_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create trade_messages table for trade chat
CREATE TABLE public.trade_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'image')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trade_ratings table
CREATE TABLE public.trade_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  rater_user_id UUID NOT NULL,
  rated_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trade_id, rater_user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trades
CREATE POLICY "Users can view trades they are involved in" 
ON public.trades 
FOR SELECT 
USING (auth.uid() = initiator_user_id OR auth.uid() = recipient_user_id);

CREATE POLICY "Users can create trades as initiator" 
ON public.trades 
FOR INSERT 
WITH CHECK (auth.uid() = initiator_user_id);

CREATE POLICY "Trade participants can update trades" 
ON public.trades 
FOR UPDATE 
USING (auth.uid() = initiator_user_id OR auth.uid() = recipient_user_id);

-- RLS Policies for trade_messages
CREATE POLICY "Trade participants can view messages" 
ON public.trade_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.trades 
    WHERE trades.id = trade_messages.trade_id 
    AND (trades.initiator_user_id = auth.uid() OR trades.recipient_user_id = auth.uid())
  )
);

CREATE POLICY "Trade participants can send messages" 
ON public.trade_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.trades 
    WHERE trades.id = trade_messages.trade_id 
    AND (trades.initiator_user_id = auth.uid() OR trades.recipient_user_id = auth.uid())
  )
);

-- RLS Policies for trade_ratings
CREATE POLICY "Users can view ratings for their trades" 
ON public.trade_ratings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.trades 
    WHERE trades.id = trade_ratings.trade_id 
    AND (trades.initiator_user_id = auth.uid() OR trades.recipient_user_id = auth.uid())
  )
);

CREATE POLICY "Trade participants can rate each other" 
ON public.trade_ratings 
FOR INSERT 
WITH CHECK (
  auth.uid() = rater_user_id AND
  EXISTS (
    SELECT 1 FROM public.trades 
    WHERE trades.id = trade_ratings.trade_id 
    AND trades.status = 'completed'
    AND (trades.initiator_user_id = auth.uid() OR trades.recipient_user_id = auth.uid())
    AND trades.initiator_user_id != trades.recipient_user_id
  )
);

-- Create indexes for performance
CREATE INDEX idx_trades_initiator ON public.trades(initiator_user_id);
CREATE INDEX idx_trades_recipient ON public.trades(recipient_user_id);
CREATE INDEX idx_trades_status ON public.trades(status);
CREATE INDEX idx_trades_created_at ON public.trades(created_at);
CREATE INDEX idx_trade_messages_trade_id ON public.trade_messages(trade_id);
CREATE INDEX idx_trade_messages_created_at ON public.trade_messages(created_at);
CREATE INDEX idx_trade_ratings_trade_id ON public.trade_ratings(trade_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for trade tables
ALTER TABLE public.trades REPLICA IDENTITY FULL;
ALTER TABLE public.trade_messages REPLICA IDENTITY FULL;
ALTER TABLE public.trade_ratings REPLICA IDENTITY FULL;