/*
  KUBATA KIÉ — FINAL SECURITY HARDENING
  Adapted to the actual Azul schema (lowercase roles/status values).
*/

-- Helper used by RLS without exposing profiles recursively.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Private profiles: own profile + admin only.
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_private" ON public.profiles;
CREATE POLICY "profiles_select_private" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin());

-- Public profile projection. It contains no email, phone, role or admin fields.
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, full_name, avatar_url, agency, bio
FROM public.profiles;
REVOKE ALL ON public.profiles_public FROM PUBLIC;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Inquiries: authenticated users may only claim their own user_id; anonymous must be NULL.
DROP POLICY IF EXISTS "inquiries_insert_public" ON public.inquiries;
CREATE POLICY "inquiries_insert_public" ON public.inquiries
FOR INSERT TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- Notifications are server-created; clients may only acknowledge them through controlled functions.
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.notifications SET is_read = true
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.notifications SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- Viewing requests: authenticated callers may only create requests for themselves; anonymous requests have NULL user_id.
DROP POLICY IF EXISTS "viewing_requests_insert_public" ON public.viewing_requests;
CREATE POLICY "viewing_requests_insert_public" ON public.viewing_requests
FOR INSERT TO anon, authenticated
WITH CHECK ((auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));

-- Service requests: same identity rule on creation.
DROP POLICY IF EXISTS "service_requests_insert_public" ON public.service_requests;
CREATE POLICY "service_requests_insert_public" ON public.service_requests
FOR INSERT TO anon, authenticated
WITH CHECK ((auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));

-- Payments are created by the secure checkout Edge Function, not by the browser.
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;

-- Analytics events may be anonymous or belong only to the current authenticated user.
DROP POLICY IF EXISTS "analytics_insert_any" ON public.analytics_events;
CREATE POLICY "analytics_insert_safe" ON public.analytics_events
FOR INSERT TO anon, authenticated
WITH CHECK ((auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));

-- Messages are immutable after creation. Read receipts go through a controlled function.
DROP POLICY IF EXISTS "messages_update_participant" ON public.messages;

CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
      AND (participant_a = auth.uid() OR participant_b = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE public.messages
  SET read_at = COALESCE(read_at, now())
  WHERE conversation_id = p_conversation_id
    AND sender_id <> auth.uid()
    AND read_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_messages_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;

-- Viewing requests: clients cannot directly manipulate status or administrative fields.
DROP POLICY IF EXISTS "viewing_requests_update_own" ON public.viewing_requests;
DROP POLICY IF EXISTS "viewing_requests_update_admin" ON public.viewing_requests;
CREATE POLICY "viewing_requests_update_admin" ON public.viewing_requests
FOR UPDATE TO authenticated
USING (public.is_admin() OR EXISTS (
  SELECT 1 FROM public.properties p
  WHERE p.id = viewing_requests.property_id AND p.owner_id = auth.uid()
))
WITH CHECK (public.is_admin() OR EXISTS (
  SELECT 1 FROM public.properties p
  WHERE p.id = viewing_requests.property_id AND p.owner_id = auth.uid()
));

CREATE OR REPLACE FUNCTION public.cancel_viewing_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.viewing_requests
    WHERE id = p_request_id AND user_id = auth.uid()
      AND status IN ('pending','confirmed')
  ) THEN
    RAISE EXCEPTION 'Pedido não encontrado ou não pode ser cancelado';
  END IF;
  UPDATE public.viewing_requests SET status = 'cancelled' WHERE id = p_request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_viewing_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_viewing_request(uuid) TO authenticated;

-- Service requests: clients create; only admin/agent manages execution fields.
-- Existing update policy already restricts updates to agent/admin. Keep it, but ensure clients cannot update.
DROP POLICY IF EXISTS "service_requests_update_agent" ON public.service_requests;
CREATE POLICY "service_requests_update_agent" ON public.service_requests
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('agent','admin')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('agent','admin')));

-- Payments: clients can start payments but cannot mutate status/amount directly.
DROP POLICY IF EXISTS "payments_update_own" ON public.payments;
CREATE OR REPLACE FUNCTION public.cancel_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.payments
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_payment_id AND user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento não encontrado ou não pode ser cancelado'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_payment(uuid) TO authenticated;

-- Audit logs must be immutable from clients.
DROP POLICY IF EXISTS "audit_logs_insert_any" ON public.audit_logs;

-- Conversation uniqueness: remove the old order-sensitive constraint, normalize pairs,
-- preserve messages when consolidating duplicates, then add NULL-safe unique indexes.
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_property_id_participant_a_participant_b_key;

DO $$
DECLARE r record; keeper uuid;
BEGIN
  FOR r IN
    SELECT property_id, LEAST(participant_a, participant_b) AS a, GREATEST(participant_a, participant_b) AS b,
           array_agg(id ORDER BY created_at, id) AS ids
    FROM public.conversations
    GROUP BY property_id, LEAST(participant_a, participant_b), GREATEST(participant_a, participant_b)
    HAVING count(*) > 1
  LOOP
    keeper := r.ids[1];
    UPDATE public.messages m
      SET conversation_id = keeper
      WHERE m.conversation_id = ANY(r.ids[2:]);
    DELETE FROM public.conversations c
      WHERE c.id = ANY(r.ids[2:]);
  END LOOP;
END $$;

UPDATE public.conversations
SET participant_a = LEAST(participant_a, participant_b),
    participant_b = GREATEST(participant_a, participant_b)
WHERE participant_a > participant_b;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_pair_property
ON public.conversations (participant_a, participant_b, property_id)
WHERE property_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_pair_no_property
ON public.conversations (participant_a, participant_b)
WHERE property_id IS NULL;

-- Analytics/admin performance indexes.
CREATE INDEX IF NOT EXISTS idx_profiles_role_created_at ON public.profiles(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON public.payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_property_created_at ON public.leads(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status_created_at ON public.inquiries(status, created_at DESC);

-- Rate-limit helper. The identifier must be supplied by trusted edge function code for anonymous requests;
-- authenticated callers are forced to their own user id.
CREATE OR REPLACE FUNCTION public.consume_inquiry_rate_limit(p_identifier text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier text;
  v_type text;
  v_window timestamptz;
  v_count integer;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v_identifier := auth.uid()::text;
    v_type := 'user_id';
  ELSE
    v_identifier := COALESCE(NULLIF(p_identifier, ''), 'anonymous');
    v_type := 'session';
  END IF;
  v_window := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  SELECT count INTO v_count
  FROM public.inquiry_rate_limits
  WHERE identifier = v_identifier AND window_start = v_window
  LIMIT 1
  FOR UPDATE;
  IF COALESCE(v_count,0) >= 10 THEN RETURN false; END IF;
  INSERT INTO public.inquiry_rate_limits(identifier, identifier_type, window_start, count)
  VALUES (v_identifier, v_type, v_window, 1)
  ON CONFLICT (identifier, window_start)
  DO UPDATE SET count = public.inquiry_rate_limits.count + 1;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_inquiry_rate_limit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_inquiry_rate_limit(text) TO anon, authenticated;
