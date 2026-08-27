-- Let a signed-in user delete their own grading scans from the client.
-- Scans are still only *created* server-side (see 20260825193409); this adds
-- owner-scoped DELETE so the "My Scans" screen can offer a remove action.

CREATE POLICY "Users can delete own scans"
  ON public.card_grading_scans FOR DELETE
  USING (auth.uid() = user_id);

GRANT DELETE ON public.card_grading_scans TO authenticated;
