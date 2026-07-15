
-- Tighten complaint_activities INSERT policy
DROP POLICY IF EXISTS activities_insert_self ON public.complaint_activities;

CREATE POLICY activities_insert_authorized
ON public.complaint_activities
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id IS NOT NULL
  AND actor_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.complaints c
    WHERE c.id = complaint_activities.complaint_id
      AND (
        c.reporter_id = auth.uid()
        OR c.assigned_officer_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          public.has_role(auth.uid(), 'officer'::public.app_role)
          AND c.department_id = (
            SELECT department_id FROM public.profiles WHERE id = auth.uid()
          )
        )
      )
  )
);

-- Prevent tampering of the actor column after the fact
DROP POLICY IF EXISTS activities_no_update ON public.complaint_activities;
CREATE POLICY activities_no_update
ON public.complaint_activities
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS activities_no_delete ON public.complaint_activities;
CREATE POLICY activities_no_delete
ON public.complaint_activities
FOR DELETE
TO authenticated
USING (false);
