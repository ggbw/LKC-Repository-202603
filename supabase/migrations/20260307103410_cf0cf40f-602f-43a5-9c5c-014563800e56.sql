ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS show_on_report_card BOOLEAN DEFAULT true;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS show_on_report_card BOOLEAN DEFAULT true;