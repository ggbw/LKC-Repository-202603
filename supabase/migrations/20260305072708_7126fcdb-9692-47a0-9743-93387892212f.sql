-- Allow teachers to insert exams
CREATE POLICY "p_exams_teacher_insert"
ON public.exams FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));

-- Allow teachers to update their own exams (optional)
CREATE POLICY "p_exams_teacher_update"
ON public.exams FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));