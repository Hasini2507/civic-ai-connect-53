
ALTER TYPE public.complaint_status ADD VALUE IF NOT EXISTS 'under_review' BEFORE 'assigned';
ALTER TYPE public.complaint_status ADD VALUE IF NOT EXISTS 'waiting_for_verification' BEFORE 'resolved';

DO $$ BEGIN
  CREATE TYPE public.complaint_visibility AS ENUM ('public','private');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS visibility public.complaint_visibility NOT NULL DEFAULT 'public';

INSERT INTO public.departments(code,name) VALUES
  ('road','Roads Department'),
  ('water','Water Department'),
  ('electricity','Electricity Department'),
  ('sanitation','Sanitation Department'),
  ('sewerage','Drainage & Sewerage Department'),
  ('municipal','Municipal General Department')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);

CREATE TABLE IF NOT EXISTS public.complaint_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  from_status public.complaint_status,
  to_status public.complaint_status,
  note text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.complaint_activities TO authenticated;
GRANT ALL ON public.complaint_activities TO service_role;
ALTER TABLE public.complaint_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activities_select_scoped ON public.complaint_activities;
CREATE POLICY activities_select_scoped ON public.complaint_activities
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND (
        c.reporter_id = auth.uid()
        OR public.has_role(auth.uid(),'admin')
        OR public.has_role(auth.uid(),'supervisor')
        OR public.has_role(auth.uid(),'commissioner')
        OR public.has_role(auth.uid(),'engineer')
        OR (public.has_role(auth.uid(),'officer')
            AND c.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS activities_insert_self ON public.complaint_activities;
CREATE POLICY activities_insert_self ON public.complaint_activities
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

DROP POLICY IF EXISTS complaints_select_all_authed ON public.complaints;
DROP POLICY IF EXISTS complaints_select_scoped ON public.complaints;
CREATE POLICY complaints_select_scoped ON public.complaints
  FOR SELECT TO authenticated USING (
    reporter_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'supervisor')
    OR public.has_role(auth.uid(),'commissioner')
    OR public.has_role(auth.uid(),'engineer')
    OR (public.has_role(auth.uid(),'officer')
        AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self_or_staff ON public.profiles;
CREATE POLICY profiles_select_self_or_staff ON public.profiles
  FOR SELECT TO authenticated USING (
    auth.uid() = id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'supervisor')
    OR public.has_role(auth.uid(),'commissioner')
    OR public.has_role(auth.uid(),'engineer')
    OR public.has_role(auth.uid(),'officer')
  );

DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS user_roles_admin_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_delete ON public.user_roles;
CREATE POLICY user_roles_admin_select ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.log_complaint_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.complaint_activities(complaint_id, actor_id, action, to_status, note)
    VALUES (NEW.id, NEW.reporter_id, 'submitted', NEW.status, 'Complaint submitted');
    INSERT INTO public.notifications(user_id, complaint_id, title, body)
    VALUES (NEW.reporter_id, NEW.id, 'Complaint submitted', NEW.title);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.complaint_activities(complaint_id, actor_id, action, from_status, to_status)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);
      INSERT INTO public.notifications(user_id, complaint_id, title, body)
      VALUES (NEW.reporter_id, NEW.id, 'Status updated', 'New status: ' || NEW.status::text);
    END IF;
    IF NEW.assigned_officer_id IS DISTINCT FROM OLD.assigned_officer_id
       AND NEW.assigned_officer_id IS NOT NULL THEN
      INSERT INTO public.complaint_activities(complaint_id, actor_id, action, note)
      VALUES (NEW.id, auth.uid(), 'assigned', 'Officer assigned');
      INSERT INTO public.notifications(user_id, complaint_id, title, body)
      VALUES (NEW.assigned_officer_id, NEW.id, 'New assignment', NEW.title);
    END IF;
    IF NEW.department_id IS DISTINCT FROM OLD.department_id
       AND NEW.department_id IS NOT NULL THEN
      INSERT INTO public.complaint_activities(complaint_id, actor_id, action, note)
      VALUES (NEW.id, auth.uid(), 'routed', 'Routed to department');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS complaints_activity_log ON public.complaints;
CREATE TRIGGER complaints_activity_log
AFTER INSERT OR UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.log_complaint_activity();

ALTER TABLE public.complaints REPLICA IDENTITY FULL;
ALTER TABLE public.complaint_activities REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_activities';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
