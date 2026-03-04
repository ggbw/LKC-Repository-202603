
-- Fix all RLS policies from RESTRICTIVE to PERMISSIVE
-- Also add missing unique constraints for upsert operations

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key') THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subject_teachers_subject_teacher_key') THEN
    ALTER TABLE public.subject_teachers ADD CONSTRAINT subject_teachers_subject_teacher_key UNIQUE (subject_id, teacher_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parent_students_parent_student_key') THEN
    ALTER TABLE public.parent_students ADD CONSTRAINT parent_students_parent_student_key UNIQUE (parent_id, student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_code_key') THEN
    ALTER TABLE public.subjects ADD CONSTRAINT subjects_code_key UNIQUE (code);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_user_id_key') THEN
    ALTER TABLE public.teachers ADD CONSTRAINT teachers_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_user_id_key') THEN
    ALTER TABLE public.students ADD CONSTRAINT students_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parents_user_id_key') THEN
    ALTER TABLE public.parents ADD CONSTRAINT parents_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- admission_enquiries
DROP POLICY IF EXISTS "Admins can manage enquiries" ON public.admission_enquiries;
DROP POLICY IF EXISTS "Admins can read enquiries" ON public.admission_enquiries;
DROP POLICY IF EXISTS "Anyone can submit enquiry" ON public.admission_enquiries;
CREATE POLICY "p_enquiry_insert" ON public.admission_enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "p_enquiry_admin" ON public.admission_enquiries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- announcements
DROP POLICY IF EXISTS "Admins and teachers can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated can read announcements" ON public.announcements;
CREATE POLICY "p_announce_manage" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "p_announce_read" ON public.announcements FOR SELECT TO authenticated USING (true);

-- assignments
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can read published assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can manage own assignments" ON public.assignments;
CREATE POLICY "p_assign_admin" ON public.assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_assign_teacher" ON public.assignments FOR ALL TO authenticated USING (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));
CREATE POLICY "p_assign_read" ON public.assignments FOR SELECT TO authenticated USING (true);

-- attendance
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "HOD can read attendance" ON public.attendance;
DROP POLICY IF EXISTS "HOY can read attendance" ON public.attendance;
DROP POLICY IF EXISTS "Students can read own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance" ON public.attendance;
CREATE POLICY "p_attend_admin" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_attend_teacher" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "p_attend_read" ON public.attendance FOR SELECT TO authenticated USING (true);

-- exam_results
DROP POLICY IF EXISTS "Admins can manage exam_results" ON public.exam_results;
DROP POLICY IF EXISTS "Authenticated can read exam_results" ON public.exam_results;
DROP POLICY IF EXISTS "Teachers can manage exam_results" ON public.exam_results;
CREATE POLICY "p_results_admin" ON public.exam_results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_results_teacher" ON public.exam_results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "p_results_read" ON public.exam_results FOR SELECT TO authenticated USING (true);

-- hod_assignments
DROP POLICY IF EXISTS "Admins can manage hod_assignments" ON public.hod_assignments;
DROP POLICY IF EXISTS "Authenticated can read hod_assignments" ON public.hod_assignments;
CREATE POLICY "p_hod_admin" ON public.hod_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_hod_read" ON public.hod_assignments FOR SELECT TO authenticated USING (true);

-- hoy_assignments
DROP POLICY IF EXISTS "Admins can manage hoy_assignments" ON public.hoy_assignments;
DROP POLICY IF EXISTS "Authenticated can read hoy_assignments" ON public.hoy_assignments;
CREATE POLICY "p_hoy_admin" ON public.hoy_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_hoy_read" ON public.hoy_assignments FOR SELECT TO authenticated USING (true);

-- parent_students
DROP POLICY IF EXISTS "Admins can manage parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Parents can read own mappings" ON public.parent_students;
CREATE POLICY "p_ps_admin" ON public.parent_students FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_ps_read" ON public.parent_students FOR SELECT TO authenticated USING (true);

-- parents
DROP POLICY IF EXISTS "Admins can manage parents" ON public.parents;
DROP POLICY IF EXISTS "Parents can read own" ON public.parents;
CREATE POLICY "p_parents_admin" ON public.parents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_parents_read" ON public.parents FOR SELECT TO authenticated USING (true);

-- profiles
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "p_profile_admin" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_profile_own_read" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "p_profile_own_update" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- students
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
DROP POLICY IF EXISTS "Authenticated can read students" ON public.students;
DROP POLICY IF EXISTS "Students can update own" ON public.students;
CREATE POLICY "p_students_admin" ON public.students FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_students_read" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "p_students_own_update" ON public.students FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- subject_teachers
DROP POLICY IF EXISTS "Admins can manage subject_teachers" ON public.subject_teachers;
DROP POLICY IF EXISTS "Authenticated can read subject_teachers" ON public.subject_teachers;
CREATE POLICY "p_st_admin" ON public.subject_teachers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_st_read" ON public.subject_teachers FOR SELECT TO authenticated USING (true);

-- subjects
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated can read subjects" ON public.subjects;
CREATE POLICY "p_subj_admin" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_subj_read" ON public.subjects FOR SELECT TO authenticated USING (true);

-- submissions
DROP POLICY IF EXISTS "Admins can manage submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can manage own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can read submissions for own assignments" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can update submissions" ON public.submissions;
CREATE POLICY "p_sub_admin" ON public.submissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_sub_student" ON public.submissions FOR ALL TO authenticated USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "p_sub_teacher_read" ON public.submissions FOR SELECT TO authenticated USING (assignment_id IN (SELECT id FROM public.assignments WHERE teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())));
CREATE POLICY "p_sub_teacher_update" ON public.submissions FOR UPDATE TO authenticated USING (assignment_id IN (SELECT id FROM public.assignments WHERE teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())));

-- teachers
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated can read teachers" ON public.teachers;
CREATE POLICY "p_teachers_admin" ON public.teachers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_teachers_read" ON public.teachers FOR SELECT TO authenticated USING (true);

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "p_roles_admin" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "p_roles_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
