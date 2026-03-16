
ALTER TABLE public.admission_enquiries
  DROP CONSTRAINT IF EXISTS admission_enquiries_status_check;

ALTER TABLE public.admission_enquiries
  ADD CONSTRAINT admission_enquiries_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'enrolled'));

ALTER TABLE public.admission_enquiries
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
