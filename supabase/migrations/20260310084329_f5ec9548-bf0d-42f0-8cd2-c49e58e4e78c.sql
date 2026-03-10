
CREATE TABLE IF NOT EXISTS public.requisition_role_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  req_role TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(req_role, user_id)
);

ALTER TABLE public.requisition_role_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read req role mappings"
  ON public.requisition_role_mappings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage req role mappings"
  ON public.requisition_role_mappings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

ALTER TABLE public.requisitions 
  ADD COLUMN IF NOT EXISTS category_officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_officer_name TEXT,
  ADD COLUMN IF NOT EXISTS md_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS md_name TEXT,
  ADD COLUMN IF NOT EXISTS category_officer_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS md_approved_at TIMESTAMPTZ;
