CREATE OR REPLACE FUNCTION public.log_complaint_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    IF NEW.priority_level IS DISTINCT FROM OLD.priority_level THEN
      INSERT INTO public.complaint_activities(complaint_id, actor_id, action, note)
      VALUES (NEW.id, auth.uid(), 'priority_changed',
        'Priority ' || OLD.priority_level::text || ' → ' || NEW.priority_level::text);
      INSERT INTO public.notifications(user_id, complaint_id, title, body)
      VALUES (NEW.reporter_id, NEW.id, 'Priority changed',
        'Priority is now ' || NEW.priority_level::text || ' for: ' || NEW.title);
      IF NEW.assigned_officer_id IS NOT NULL AND NEW.assigned_officer_id <> NEW.reporter_id THEN
        INSERT INTO public.notifications(user_id, complaint_id, title, body)
        VALUES (NEW.assigned_officer_id, NEW.id, 'Priority changed',
          'Priority is now ' || NEW.priority_level::text || ' for: ' || NEW.title);
      END IF;
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
END $function$;

DROP TRIGGER IF EXISTS trg_log_complaint_activity ON public.complaints;
CREATE TRIGGER trg_log_complaint_activity
AFTER INSERT OR UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.log_complaint_activity();