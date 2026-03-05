
-- Add comment columns to exam_results
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS short_comment text;
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS long_comment text;

-- Create class_teachers table for class teacher assignments
CREATE TABLE IF NOT EXISTS public.class_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  form text NOT NULL,
  class_name text NOT NULL,
  UNIQUE(form, class_name)
);

ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p_ct_admin" ON public.class_teachers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "p_ct_read" ON public.class_teachers FOR SELECT TO authenticated
  USING (true);
