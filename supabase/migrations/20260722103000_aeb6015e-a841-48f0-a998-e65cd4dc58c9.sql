-- Real, user-owned collection boxes for organizing cards into custom groups.
-- Replaces the previous UI-only mock ("Collection Boxes" page held hardcoded
-- data that was never persisted).

CREATE TABLE public.card_boxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Box',
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.card_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own boxes"
ON public.card_boxes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boxes"
ON public.card_boxes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boxes"
ON public.card_boxes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boxes"
ON public.card_boxes
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_card_boxes_updated_at
BEFORE UPDATE ON public.card_boxes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_card_boxes_user_id ON public.card_boxes(user_id);

-- Membership: which of a user's real cards live in which box.
CREATE TABLE public.card_box_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id UUID NOT NULL REFERENCES public.card_boxes(id) ON DELETE CASCADE,
  user_card_id UUID NOT NULL REFERENCES public.user_cards(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (box_id, user_card_id)
);

ALTER TABLE public.card_box_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in their own boxes"
ON public.card_box_items
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.card_boxes b WHERE b.id = box_id AND b.user_id = auth.uid())
);

CREATE POLICY "Users can add their own cards to their own boxes"
ON public.card_box_items
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.card_boxes b WHERE b.id = box_id AND b.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.user_cards c WHERE c.id = user_card_id AND c.user_id = auth.uid())
);

CREATE POLICY "Users can remove items from their own boxes"
ON public.card_box_items
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.card_boxes b WHERE b.id = box_id AND b.user_id = auth.uid())
);

CREATE INDEX idx_card_box_items_box_id ON public.card_box_items(box_id);
CREATE INDEX idx_card_box_items_user_card_id ON public.card_box_items(user_card_id);
