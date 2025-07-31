import { supabase } from '@/integrations/supabase/client';

export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  service_type: string;
  description?: string;
  base_price: number;
  price_per_kg: number;
  max_weight_kg?: number;
  max_dimensions_cm?: string;
  tracking_included: boolean;
  insurance_included: boolean;
  estimated_delivery_days?: number;
  domestic_only: boolean;
  is_active: boolean;
}

export interface ShippingRate {
  id: string;
  shipping_method_id: string;
  country_code: string;
  zone?: string;
  weight_from_kg: number;
  weight_to_kg?: number;
  price: number;
}

export interface TradeShipment {
  id: string;
  trade_id: string;
  shipping_method_id: string;
  sender_user_id: string;
  recipient_user_id: string;
  tracking_number?: string;
  shipping_label_url?: string;
  shipping_cost: number;
  insurance_value: number;
  weight_kg?: number;
  dimensions_cm?: string;
  sender_address: any;
  recipient_address: any;
  status: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  event_description: string;
  location?: string;
  timestamp: string;
  carrier_event_id?: string;
}

// Get all active shipping methods
export const getShippingMethods = async (domestic: boolean = true): Promise<ShippingMethod[]> => {
  const { data, error } = await supabase
    .from('shipping_methods')
    .select('*')
    .eq('is_active', true)
    .eq('domestic_only', domestic)
    .order('base_price', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch shipping methods: ${error.message}`);
  }

  return data || [];
};

// Calculate shipping cost
export const calculateShippingCost = async (
  methodId: string,
  countryCode: string,
  weightKg: number
): Promise<number> => {
  // Get the base method
  const { data: method, error: methodError } = await supabase
    .from('shipping_methods')
    .select('*')
    .eq('id', methodId)
    .single();

  if (methodError) {
    throw new Error(`Failed to fetch shipping method: ${methodError.message}`);
  }

  // Check for specific rate for country/weight
  const { data: rates, error: ratesError } = await supabase
    .from('shipping_rates')
    .select('*')
    .eq('shipping_method_id', methodId)
    .eq('country_code', countryCode)
    .lte('weight_from_kg', weightKg)
    .or(`weight_to_kg.gte.${weightKg},weight_to_kg.is.null`)
    .limit(1);

  if (ratesError) {
    console.warn('No specific rates found, using base calculation');
  }

  // Use specific rate if found, otherwise calculate from base
  if (rates && rates.length > 0) {
    return rates[0].price;
  }

  // Calculate using base price + weight multiplier
  const baseCost = method.base_price;
  const weightCost = (method.price_per_kg || 0) * weightKg;
  
  return baseCost + weightCost;
};

// Create a shipment
export const createShipment = async (shipmentData: Omit<TradeShipment, 'id' | 'created_at' | 'updated_at'>): Promise<TradeShipment> => {
  const { data, error } = await supabase
    .from('trade_shipments')
    .insert(shipmentData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create shipment: ${error.message}`);
  }

  return data;
};

// Get shipments for a trade
export const getTradeShipments = async (tradeId: string): Promise<TradeShipment[]> => {
  const { data, error } = await supabase
    .from('trade_shipments')
    .select('*, shipping_method:shipping_methods(*)')
    .eq('trade_id', tradeId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch shipments: ${error.message}`);
  }

  return data || [];
};

// Update shipment status
export const updateShipmentStatus = async (
  shipmentId: string,
  status: string,
  trackingNumber?: string
): Promise<TradeShipment> => {
  const updateData: any = { status };
  
  if (trackingNumber) {
    updateData.tracking_number = trackingNumber;
  }
  
  if (status === 'shipped') {
    updateData.shipped_at = new Date().toISOString();
  }
  
  if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('trade_shipments')
    .update(updateData)
    .eq('id', shipmentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update shipment: ${error.message}`);
  }

  return data;
};

// Add tracking event
export const addTrackingEvent = async (eventData: Omit<TrackingEvent, 'id' | 'created_at'>): Promise<TrackingEvent> => {
  const { data, error } = await supabase
    .from('tracking_events')
    .insert(eventData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add tracking event: ${error.message}`);
  }

  return data;
};

// Get tracking events for a shipment
export const getTrackingEvents = async (shipmentId: string): Promise<TrackingEvent[]> => {
  const { data, error } = await supabase
    .from('tracking_events')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('timestamp', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch tracking events: ${error.message}`);
  }

  return data || [];
};