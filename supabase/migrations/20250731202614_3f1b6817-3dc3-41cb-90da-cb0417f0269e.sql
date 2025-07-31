-- Fix security warnings by updating functions with proper search_path

-- Update increment_listing_views function with proper search_path
CREATE OR REPLACE FUNCTION public.increment_listing_views(listing_id UUID)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.marketplace_listings 
  SET views_count = views_count + 1 
  WHERE id = listing_id;
END;
$$;

-- Update update_interested_count function with proper search_path
CREATE OR REPLACE FUNCTION public.update_interested_count()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.marketplace_listings 
    SET interested_count = interested_count + 1 
    WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.marketplace_listings 
    SET interested_count = interested_count - 1 
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;