-- Create card_images table for user-uploaded card photos
CREATE TABLE public.card_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  caption TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on card_images
ALTER TABLE public.card_images ENABLE ROW LEVEL SECURITY;

-- Create policies for card_images
CREATE POLICY "Users can view their own card images" 
ON public.card_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own card images" 
ON public.card_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card images" 
ON public.card_images 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own card images" 
ON public.card_images 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create escrow_transactions table
CREATE TABLE public.escrow_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL,
  initiator_user_id UUID NOT NULL,
  recipient_user_id UUID NOT NULL,
  initiator_escrow_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  recipient_escrow_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  initiator_paid BOOLEAN DEFAULT false,
  recipient_paid BOOLEAN DEFAULT false,
  initiator_payment_id TEXT,
  recipient_payment_id TEXT,
  release_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on escrow_transactions
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for escrow_transactions
CREATE POLICY "Trade participants can view escrow" 
ON public.escrow_transactions 
FOR SELECT 
USING ((auth.uid() = initiator_user_id) OR (auth.uid() = recipient_user_id));

CREATE POLICY "Trade participants can create escrow" 
ON public.escrow_transactions 
FOR INSERT 
WITH CHECK ((auth.uid() = initiator_user_id) OR (auth.uid() = recipient_user_id));

CREATE POLICY "Trade participants can update escrow" 
ON public.escrow_transactions 
FOR UPDATE 
USING ((auth.uid() = initiator_user_id) OR (auth.uid() = recipient_user_id));

-- Create storage bucket for card images
INSERT INTO storage.buckets (id, name, public) VALUES ('card-images', 'card-images', true);

-- Create policies for card-images bucket
CREATE POLICY "Users can view all card images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'card-images');

CREATE POLICY "Users can upload their own card images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own card images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own card images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create triggers for updated_at columns
CREATE TRIGGER update_card_images_updated_at
BEFORE UPDATE ON public.card_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_escrow_transactions_updated_at
BEFORE UPDATE ON public.escrow_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_card_images_user_id ON public.card_images(user_id);
CREATE INDEX idx_card_images_card_id ON public.card_images(card_id);
CREATE INDEX idx_escrow_transactions_trade_id ON public.escrow_transactions(trade_id);
CREATE INDEX idx_escrow_transactions_users ON public.escrow_transactions(initiator_user_id, recipient_user_id);