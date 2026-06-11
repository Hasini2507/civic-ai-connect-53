CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested text;
  final_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));

  requested := COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'citizen');
  IF requested IN ('citizen', 'officer', 'admin') THEN
    final_role := requested::public.app_role;
  ELSE
    final_role := 'citizen'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, final_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;