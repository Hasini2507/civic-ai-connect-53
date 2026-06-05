
-- Enums
CREATE TYPE public.app_role AS ENUM ('citizen','officer','supervisor','engineer','commissioner','admin');
CREATE TYPE public.complaint_status AS ENUM ('submitted','assigned','in_progress','resolved','verified','closed','rejected');
CREATE TYPE public.priority_level AS ENUM ('low','medium','high','critical');
CREATE TYPE public.complaint_category AS ENUM ('pothole','road_damage','drainage_blockage','water_leakage','garbage_overflow','streetlight_failure','open_manhole','fallen_tree','traffic_signal_damage','public_infrastructure_damage','other');
CREATE TYPE public.media_kind AS ENUM ('image','video','audio');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + assign citizen role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'citizen')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DEPARTMENTS
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO authenticated, anon;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_read_all" ON public.departments FOR SELECT USING (true);
CREATE POLICY "departments_admin_write" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.departments (name, code) VALUES
  ('Road Department','road'),
  ('Water Department','water'),
  ('Electricity Department','electricity'),
  ('Sanitation Department','sanitation'),
  ('Sewerage Department','sewerage'),
  ('Municipal Administration','municipal');

-- SLA CONFIG
CREATE TABLE public.sla_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.complaint_category NOT NULL UNIQUE,
  hours_to_resolve INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sla_configurations TO authenticated;
GRANT ALL ON public.sla_configurations TO service_role;
ALTER TABLE public.sla_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sla_read_all" ON public.sla_configurations FOR SELECT TO authenticated USING (true);
CREATE POLICY "sla_admin_write" ON public.sla_configurations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.sla_configurations (category, hours_to_resolve) VALUES
  ('open_manhole', 12),
  ('water_leakage', 24),
  ('garbage_overflow', 24),
  ('pothole', 48),
  ('streetlight_failure', 48),
  ('road_damage', 72),
  ('drainage_blockage', 36),
  ('fallen_tree', 24),
  ('traffic_signal_damage', 12),
  ('public_infrastructure_damage', 72),
  ('other', 72);

-- COMPLAINTS
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category public.complaint_category NOT NULL DEFAULT 'other',
  severity TEXT,
  priority_score INT NOT NULL DEFAULT 0,
  priority_level public.priority_level NOT NULL DEFAULT 'medium',
  status public.complaint_status NOT NULL DEFAULT 'submitted',
  department_id UUID REFERENCES public.departments(id),
  assigned_officer_id UUID REFERENCES auth.users(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  supporter_count INT NOT NULL DEFAULT 1,
  ai_analysis JSONB,
  sla_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX complaints_status_idx ON public.complaints (status);
CREATE INDEX complaints_geo_idx ON public.complaints (latitude, longitude);
CREATE INDEX complaints_reporter_idx ON public.complaints (reporter_id);
GRANT SELECT, INSERT, UPDATE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Citizens can see all complaints (public civic data) but author info is gated by anonymous flag in UI
CREATE POLICY "complaints_select_all_authed" ON public.complaints FOR SELECT TO authenticated USING (true);
CREATE POLICY "complaints_insert_own" ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "complaints_update_own_or_staff" ON public.complaints FOR UPDATE TO authenticated
  USING (
    auth.uid() = reporter_id
    OR public.has_role(auth.uid(),'officer')
    OR public.has_role(auth.uid(),'supervisor')
    OR public.has_role(auth.uid(),'engineer')
    OR public.has_role(auth.uid(),'commissioner')
    OR public.has_role(auth.uid(),'admin')
  );
CREATE TRIGGER trg_complaints_updated BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COMPLAINT MEDIA
CREATE TABLE public.complaint_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  kind public.media_kind NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX complaint_media_cid_idx ON public.complaint_media (complaint_id);
GRANT SELECT, INSERT, DELETE ON public.complaint_media TO authenticated;
GRANT ALL ON public.complaint_media TO service_role;
ALTER TABLE public.complaint_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_select_all_authed" ON public.complaint_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "media_insert_for_own_complaint" ON public.complaint_media FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.reporter_id = auth.uid()));
CREATE POLICY "media_delete_own_or_admin" ON public.complaint_media FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.reporter_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );

-- COMPLAINT SUPPORTERS
CREATE TABLE public.complaint_supporters (
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (complaint_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.complaint_supporters TO authenticated;
GRANT ALL ON public.complaint_supporters TO service_role;
ALTER TABLE public.complaint_supporters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_select_authed" ON public.complaint_supporters FOR SELECT TO authenticated USING (true);
CREATE POLICY "sup_insert_self" ON public.complaint_supporters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sup_delete_self" ON public.complaint_supporters FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to bump supporter_count
CREATE OR REPLACE FUNCTION public.bump_supporter_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.complaints SET supporter_count = supporter_count + 1 WHERE id = NEW.complaint_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.complaints SET supporter_count = GREATEST(1, supporter_count - 1) WHERE id = OLD.complaint_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_supporter_bump AFTER INSERT OR DELETE ON public.complaint_supporters
  FOR EACH ROW EXECUTE FUNCTION public.bump_supporter_count();

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notif_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
