-- Create storage bucket for student file submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-files', 'submission-files', false)
ON CONFLICT (id) DO NOTHING;

-- Students can upload their own submission files
CREATE POLICY "Students can upload submission files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'submission-files');

-- Authenticated users (teachers, admins) can read submission files
CREATE POLICY "Authenticated users can read submission files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'submission-files');

-- Students can delete their own submission files
CREATE POLICY "Students can delete own submission files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'submission-files');