-- ── Departments table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read departments"
  ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed with the existing hardcoded list so existing teacher records still match
INSERT INTO public.departments (name, sort_order) VALUES
  ('Administration',     1),
  ('Science',            2),
  ('Mathematics',        3),
  ('Languages',          4),
  ('Humanities',         5),
  ('ICT',                6),
  ('Arts',               7),
  ('Physical Education', 8),
  ('Finance',            9),
  ('Maintenance',       10),
  ('Library',           11),
  ('Other',             12)
ON CONFLICT (name) DO NOTHING;