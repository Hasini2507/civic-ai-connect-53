
-- 1. Fix activities_insert_null_actor: drop legacy permissive policy if it still exists
DROP POLICY IF EXISTS activities_insert_self ON public.complaint_activities;

-- 2. Scope complaint_media SELECT to complaint viewers
DROP POLICY IF EXISTS media_select_all_authed ON public.complaint_media;
CREATE POLICY media_select_scoped ON public.complaint_media
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.complaints c
    WHERE c.id = complaint_media.complaint_id
      AND (
        c.reporter_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'supervisor'::app_role)
        OR public.has_role(auth.uid(), 'commissioner'::app_role)
        OR public.has_role(auth.uid(), 'engineer'::app_role)
        OR (public.has_role(auth.uid(), 'officer'::app_role)
            AND c.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid()))
      )
  ));

-- 3. Scope complaint_supporters SELECT
DROP POLICY IF EXISTS sup_select_authed ON public.complaint_supporters;
CREATE POLICY sup_select_scoped ON public.complaint_supporters
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_supporters.complaint_id
        AND (
          c.reporter_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'supervisor'::app_role)
          OR public.has_role(auth.uid(), 'commissioner'::app_role)
          OR public.has_role(auth.uid(), 'engineer'::app_role)
          OR (public.has_role(auth.uid(), 'officer'::app_role)
              AND c.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid()))
        )
    )
  );

-- 4. Move phone off profiles into a self+admin-only contacts table
CREATE TABLE IF NOT EXISTS public.profile_contacts (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_contacts TO authenticated;
GRANT ALL ON public.profile_contacts TO service_role;
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_select_self_or_admin ON public.profile_contacts;
CREATE POLICY contacts_select_self_or_admin ON public.profile_contacts
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS contacts_insert_self ON public.profile_contacts;
CREATE POLICY contacts_insert_self ON public.profile_contacts
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS contacts_update_self ON public.profile_contacts;
CREATE POLICY contacts_update_self ON public.profile_contacts
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS contacts_admin_all ON public.profile_contacts;
CREATE POLICY contacts_admin_all ON public.profile_contacts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_profile_contacts_updated_at BEFORE UPDATE ON public.profile_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing phone values
INSERT INTO public.profile_contacts (id, phone)
SELECT id, phone FROM public.profiles WHERE phone IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Drop phone column from profiles so staff can no longer read it
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;

-- 5. Storage: add UPDATE policy for complaint-media bucket (folder ownership)
DROP POLICY IF EXISTS complaint_media_update_own ON storage.objects;
CREATE POLICY complaint_media_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'complaint-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'complaint-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. Realtime: enable RLS on realtime.messages with authenticated-only topic access
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated can receive realtime" ON realtime.messages
  FOR SELECT TO authenticated
  USING (true);
-- Postgres-changes row visibility is still enforced by source-table RLS.

-- 7. has_role: switch to SECURITY INVOKER so it is no longer a definer function exposed to signed-in users.
-- All callers pass auth.uid() and user_roles has a SELECT-own policy, so invoker semantics still resolve correctly.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;
