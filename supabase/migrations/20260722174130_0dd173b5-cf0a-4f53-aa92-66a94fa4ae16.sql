
CREATE TABLE public.collection_boxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'box',
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_boxes TO authenticated;
GRANT ALL ON public.collection_boxes TO service_role;

ALTER TABLE public.collection_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own collection boxes"
  ON public.collection_boxes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_collection_boxes_updated_at
  BEFORE UPDATE ON public.collection_boxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_cards
  ADD COLUMN IF NOT EXISTS box_id UUID REFERENCES public.collection_boxes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS user_cards_box_id_idx ON public.user_cards(box_id);
