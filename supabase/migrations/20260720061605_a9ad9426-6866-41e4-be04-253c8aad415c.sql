
-- 1. Prevent signup self-escalation: always assign citizen role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));

  -- Always assign the default citizen role. Promotions to officer/admin
  -- must be performed by an existing admin via the user_roles table
  -- (which enforces admin-only INSERT via RLS).
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citizen'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. Scope officer updates on complaints to their own department
DROP POLICY IF EXISTS complaints_update_own_or_staff ON public.complaints;

CREATE POLICY complaints_update_own_or_staff
ON public.complaints
FOR UPDATE
TO authenticated
USING (
  auth.uid() = reporter_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'officer'::app_role)
    AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = reporter_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'officer'::app_role)
    AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- 3. Lock down complaint-media storage reads: only reporter, assigned officer,
-- officer in the complaint's department, or admin.
CREATE OR REPLACE FUNCTION public.can_read_complaint_media_object(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.complaint_media cm
    JOIN public.complaints c ON c.id = cm.complaint_id
    WHERE cm.storage_path = object_name
      AND (
        c.reporter_id = auth.uid()
        OR c.assigned_officer_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          public.has_role(auth.uid(), 'officer'::public.app_role)
          AND c.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid())
        )
      )
  )
  OR (split_part(object_name, '/', 1) = auth.uid()::text);
$$;

DROP POLICY IF EXISTS complaint_media_read ON storage.objects;

CREATE POLICY complaint_media_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-media'
  AND public.can_read_complaint_media_object(name)
);

-- 4. Realtime: deny broadcast/presence subscriptions. App only uses
-- postgres_changes (which is gated by table RLS, not realtime.messages RLS).
DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
