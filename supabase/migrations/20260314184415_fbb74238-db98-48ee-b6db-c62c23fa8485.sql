-- 1. Make handle_new_user idempotent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Class-teacher RLS
DROP POLICY IF EXISTS "Class teachers can update student class" ON public.students;
CREATE POLICY "Class teachers can update student class"
  ON public.students FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_teachers ct
      JOIN public.teachers t ON t.id = ct.teacher_id
      WHERE t.user_id = auth.uid() AND ct.form = students.form AND ct.class_name = students.class_name
    )
    OR (students.class_name IS NULL AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = auth.uid()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_teachers ct
      JOIN public.teachers t ON t.id = ct.teacher_id
      WHERE t.user_id = auth.uid() AND ct.form = students.form
        AND (ct.class_name = students.class_name OR students.class_name IS NULL)
    )
  );

-- 3. Profiles: allow admins to delete
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 4. User roles: allow admins to delete
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 5. Exam results: allow teachers to update
DROP POLICY IF EXISTS "Teachers can update exam_results" ON public.exam_results;
CREATE POLICY "Teachers can update exam_results" ON public.exam_results FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hod'));

-- 6. Submissions: allow admins to update
DROP POLICY IF EXISTS "Admins can update submissions" ON public.submissions;
CREATE POLICY "Admins can update submissions" ON public.submissions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));