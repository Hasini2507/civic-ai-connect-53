
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- Storage policies for complaint-media bucket
CREATE POLICY "complaint_media_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'complaint-media');

CREATE POLICY "complaint_media_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'complaint-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "complaint_media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'complaint-media' AND (storage.foldername(name))[1] = auth.uid()::text);
