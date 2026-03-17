ALTER TABLE public.exam_results
  ADD CONSTRAINT exam_results_student_subject_exam_unique
  UNIQUE (student_id, subject_id, exam_name);