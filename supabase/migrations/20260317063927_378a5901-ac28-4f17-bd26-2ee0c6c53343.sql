DROP POLICY IF EXISTS "Class teachers can manage student_subjects" ON public.student_subjects;

CREATE POLICY "Class teachers can manage student_subjects"
  ON public.student_subjects
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR
    EXISTS (
      SELECT 1
      FROM public.class_teachers ct
      JOIN public.teachers t ON t.id = ct.teacher_id
      JOIN public.students s ON s.id = student_subjects.student_id
      WHERE t.user_id = auth.uid()
        AND ct.form = s.form
        AND ct.class_name = s.class_name
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR
    EXISTS (
      SELECT 1
      FROM public.class_teachers ct
      JOIN public.teachers t ON t.id = ct.teacher_id
      JOIN public.students s ON s.id = student_subjects.student_id
      WHERE t.user_id = auth.uid()
        AND ct.form = s.form
        AND ct.class_name = s.class_name
    )
  );