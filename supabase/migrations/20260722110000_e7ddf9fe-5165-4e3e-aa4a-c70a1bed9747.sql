
-- ────────────────────────────────────────────────────────────────────────────
-- Collection Boxes: real feature, replacing the previous fully-mock page.
-- A box is a named grouping a user creates to organize their own collection
-- (e.g. "Cards to Trade", "High Value"). One box per card at most, matching
-- a physical binder/box mental model — no join table needed.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.collection_boxes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'Box',
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collection_boxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own collection boxes" ON public.collection_boxes;
CREATE POLICY "Users manage their own collection boxes"
  ON public.collection_boxes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_collection_boxes_updated_at ON public.collection_boxes;
CREATE TRIGGER update_collection_boxes_updated_at
  BEFORE UPDATE ON public.collection_boxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_cards
  ADD COLUMN IF NOT EXISTS box_id uuid REFERENCES public.collection_boxes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_cards_box_id ON public.user_cards(box_id);
