
-- 1) Promote old staff roles to officer
UPDATE public.user_roles SET role = 'officer'
 WHERE role IN ('supervisor','engineer','commissioner');

-- 2) Remove duplicates that may result
DELETE FROM public.user_roles a
 USING public.user_roles b
 WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.role = b.role;

-- 3) Disable anonymous reporting
ALTER TABLE public.complaints ALTER COLUMN is_anonymous SET DEFAULT false;
UPDATE public.complaints SET is_anonymous = false WHERE is_anonymous = true;
