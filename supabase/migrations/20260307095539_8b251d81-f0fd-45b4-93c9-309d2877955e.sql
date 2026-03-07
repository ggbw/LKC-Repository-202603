
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS attachment_name TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-attachments', 'assignment-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Teachers can upload assignment attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assignment-attachments');

CREATE POLICY "Authenticated users can read assignment attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assignment-attachments');

CREATE POLICY "Teachers can delete their own assignment attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assignment-attachments');
