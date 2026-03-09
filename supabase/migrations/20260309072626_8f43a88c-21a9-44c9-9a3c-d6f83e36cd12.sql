-- Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(form, name)
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read classes"
ON public.classes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage classes"
ON public.classes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Seed from existing students
INSERT INTO public.classes (form, name)
SELECT DISTINCT form, class_name
FROM public.students
WHERE class_name IS NOT NULL AND class_name != '' AND form IS NOT NULL
ON CONFLICT (form, name) DO NOTHING;