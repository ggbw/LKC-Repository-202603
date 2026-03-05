
-- Drop existing restrictive policies on submissions
DROP POLICY IF EXISTS "p_sub_admin" ON public.submissions;
DROP POLICY IF EXISTS "p_sub_student" ON public.submissions;
DROP POLICY IF EXISTS "p_sub_teacher_read" ON public.submissions;
DROP POLICY IF EXISTS "p_sub_teacher_update" ON public.submissions;

-- Recreate as PERMISSIVE (default) so any matching policy grants access
CREATE POLICY "p_sub_admin" ON public.submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "p_sub_student_select" ON public.submissions FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "p_sub_student_insert" ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "p_sub_student_update" ON public.submissions FOR UPDATE TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "p_sub_teacher_read" ON public.submissions FOR SELECT TO authenticated
  USING (assignment_id IN (
    SELECT id FROM public.assignments WHERE teacher_id IN (
      SELECT id FROM public.teachers WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "p_sub_teacher_update" ON public.submissions FOR UPDATE TO authenticated
  USING (assignment_id IN (
    SELECT id FROM public.assignments WHERE teacher_id IN (
      SELECT id FROM public.teachers WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "p_sub_teacher_delete" ON public.submissions FOR DELETE TO authenticated
  USING (assignment_id IN (
    SELECT id FROM public.assignments WHERE teacher_id IN (
      SELECT id FROM public.teachers WHERE user_id = auth.uid()
    )
  ));
