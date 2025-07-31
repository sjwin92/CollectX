-- Create shipping system tables
CREATE TABLE public.shipping_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  carrier TEXT NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  price_per_kg DECIMAL(10,2) DEFAULT 0,
  max_weight_kg DECIMAL(5,2),
  max_dimensions_cm TEXT,
  tracking_included BOOLEAN DEFAULT false,
  insurance_included BOOLEAN DEFAULT false,
  estimated_delivery_days INTEGER,
  domestic_only BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shipping rates for different zones/countries
CREATE TABLE public.shipping_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipping_method_id UUID NOT NULL REFERENCES public.shipping_methods(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  zone TEXT,
  weight_from_kg DECIMAL(5,2) DEFAULT 0,
  weight_to_kg DECIMAL(5,2),
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trade shipments table
CREATE TABLE public.trade_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL,
  shipping_method_id UUID NOT NULL REFERENCES public.shipping_methods(id),
  sender_user_id UUID NOT NULL,
  recipient_user_id UUID NOT NULL,
  tracking_number TEXT,
  shipping_label_url TEXT,
  shipping_cost DECIMAL(10,2) NOT NULL,
  insurance_value DECIMAL(10,2) DEFAULT 0,
  weight_kg DECIMAL(5,2),
  dimensions_cm TEXT,
  sender_address JSONB NOT NULL,
  recipient_address JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create tracking events table
CREATE TABLE public.tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.trade_shipments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  location TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  carrier_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all shipping tables
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- Policies for shipping_methods (public read)
CREATE POLICY "Anyone can view active shipping methods" 
ON public.shipping_methods 
FOR SELECT 
USING (is_active = true);

-- Policies for shipping_rates (public read)
CREATE POLICY "Anyone can view shipping rates" 
ON public.shipping_rates 
FOR SELECT 
USING (true);

-- Policies for trade_shipments
CREATE POLICY "Trade participants can view shipments" 
ON public.trade_shipments 
FOR SELECT 
USING ((auth.uid() = sender_user_id) OR (auth.uid() = recipient_user_id));

CREATE POLICY "Trade participants can create shipments" 
ON public.trade_shipments 
FOR INSERT 
WITH CHECK ((auth.uid() = sender_user_id) OR (auth.uid() = recipient_user_id));

CREATE POLICY "Trade participants can update shipments" 
ON public.trade_shipments 
FOR UPDATE 
USING ((auth.uid() = sender_user_id) OR (auth.uid() = recipient_user_id));

-- Policies for tracking_events
CREATE POLICY "Shipment participants can view tracking" 
ON public.tracking_events 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.trade_shipments 
  WHERE trade_shipments.id = tracking_events.shipment_id 
  AND ((auth.uid() = sender_user_id) OR (auth.uid() = recipient_user_id))
));

CREATE POLICY "System can create tracking events" 
ON public.tracking_events 
FOR INSERT 
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_shipping_methods_updated_at
BEFORE UPDATE ON public.shipping_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trade_shipments_updated_at
BEFORE UPDATE ON public.trade_shipments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert UK shipping methods
INSERT INTO public.shipping_methods (name, carrier, service_type, description, base_price, tracking_included, estimated_delivery_days, domestic_only) VALUES
('Royal Mail 1st Class', 'Royal Mail', 'standard', 'Next working day delivery for most of the UK', 1.25, false, 1, true),
('Royal Mail 2nd Class', 'Royal Mail', 'standard', 'Delivery within 2-3 working days', 0.95, false, 3, true),
('Royal Mail Tracked 48', 'Royal Mail', 'tracked', 'Delivery within 2-3 working days with tracking', 4.50, true, 3, true),
('Royal Mail Tracked 24', 'Royal Mail', 'tracked', 'Next working day delivery with tracking', 6.50, true, 1, true),
('Royal Mail Special Delivery Guaranteed', 'Royal Mail', 'express', '1pm next working day delivery with compensation', 8.50, true, 1, true),
('Royal Mail International Standard', 'Royal Mail', 'international', 'International delivery within 3-7 working days', 12.50, false, 7, false),
('Royal Mail International Tracked', 'Royal Mail', 'international', 'International delivery with tracking', 18.50, true, 7, false);

-- Create indexes for performance
CREATE INDEX idx_shipping_rates_method_country ON public.shipping_rates(shipping_method_id, country_code);
CREATE INDEX idx_trade_shipments_trade ON public.trade_shipments(trade_id);
CREATE INDEX idx_tracking_events_shipment ON public.tracking_events(shipment_id);
CREATE INDEX idx_tracking_events_timestamp ON public.tracking_events(timestamp DESC);