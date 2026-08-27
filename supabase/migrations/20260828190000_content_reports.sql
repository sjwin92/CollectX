-- Let users flag a listing, store SKU, user or message for review.
-- Minimal for launch: a write-mostly table. Anyone signed in can file a report
-- about someone else's content; only admins can read them (review is a DB
-- query for now, an admin queue can come later).

CREATE TABLE IF NOT EXISTS public.content_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type  text NOT NULL CHECK (content_type IN ('listing', 'store_sku', 'user', 'message')),
  content_id    text NOT NULL,
  reason        text NOT NULL CHECK (reason IN (
    'counterfeit', 'not_as_described', 'prohibited_item', 'stolen',
    'offensive', 'spam_or_scam', 'other'
  )),
  details       text,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_reports_open_idx
  ON public.content_reports (created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS content_reports_target_idx
  ON public.content_reports (content_type, content_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Signed-in users can file a report as themselves. No SELECT for the reporter —
-- reports are not a public record.
CREATE POLICY "file a report"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Admins can read and triage everything.
CREATE POLICY "admins read reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins update reports"
  ON public.content_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;

CREATE TRIGGER content_reports_set_updated_at
  BEFORE UPDATE ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Client entry point (matches the codebase convention of writing through an
-- RPC rather than a direct .from() insert). Validates the enums and rate-caps
-- one reporter to 20 reports/hour so the table can't be flooded.
CREATE OR REPLACE FUNCTION public.file_content_report(
  _content_type text,
  _content_id   text,
  _reason       text,
  _details      text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  recent int;
  new_id uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _content_id IS NULL OR btrim(_content_id) = '' THEN RAISE EXCEPTION 'content_id required'; END IF;
  IF length(coalesce(_details, '')) > 2000 THEN RAISE EXCEPTION 'Details are too long'; END IF;

  SELECT count(*) INTO recent
    FROM public.content_reports
   WHERE reporter_id = caller AND created_at > now() - interval '1 hour';
  IF recent >= 20 THEN
    RAISE EXCEPTION 'Too many reports in a short time — please try again later.';
  END IF;

  INSERT INTO public.content_reports (reporter_id, content_type, content_id, reason, details)
  VALUES (caller, _content_type, btrim(_content_id), _reason, nullif(btrim(_details), ''))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.file_content_report(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.file_content_report(text, text, text, text) TO authenticated;
