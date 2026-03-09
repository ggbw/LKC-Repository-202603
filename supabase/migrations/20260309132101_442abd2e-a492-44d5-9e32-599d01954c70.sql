
-- Requisitions module enums
CREATE TYPE public.req_category AS ENUM ('Stationery', 'Maintenance', 'ICT Equipment', 'Vehicle/Transport', 'Resource Centre', 'Other');
CREATE TYPE public.req_urgency AS ENUM ('Normal', 'Urgent', 'Emergency');
CREATE TYPE public.req_status AS ENUM (
  'Pending Departmental Review',
  'Recommended by Departmental Reviewer',
  'Submitted to Screening & Documentation Officer',
  'Submitted to Executive Approver',
  'Approved - Action Pending',
  'Completed',
  'Rejected'
);
CREATE TYPE public.req_executor AS ENUM (
  'Stationery Officer',
  'Maintenance Officer',
  'ICT Head',
  'CFO',
  'Resource Centre Admin'
);

-- Main requisitions table
CREATE TABLE IF NOT EXISTS public.requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_number TEXT UNIQUE NOT NULL DEFAULT ('REQ-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  requestor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requestor_name TEXT NOT NULL,
  department TEXT NOT NULL,
  category req_category NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  justification TEXT NOT NULL,
  date_required DATE NOT NULL,
  urgency req_urgency NOT NULL DEFAULT 'Normal',
  attachment_url TEXT,
  attachment_name TEXT,
  status req_status NOT NULL DEFAULT 'Pending Departmental Review',
  current_stage INTEGER NOT NULL DEFAULT 1,
  dept_reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  screening_officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  exec_approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executor req_executor,
  executor_assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit trail
CREATE TABLE IF NOT EXISTS public.requisition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  stage INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read requisitions"
  ON public.requisitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert requisitions"
  ON public.requisitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = requestor_id);
CREATE POLICY "Authenticated users can update requisitions"
  ON public.requisitions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can read logs"
  ON public.requisition_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert logs"
  ON public.requisition_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for requisition attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('requisition-attachments', 'requisition-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload requisition attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'requisition-attachments');

CREATE POLICY "Authenticated users can read requisition attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'requisition-attachments');
