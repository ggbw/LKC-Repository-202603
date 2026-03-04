
-- =============================================
-- LKC School Management System - Database Schema
-- =============================================

-- 1. App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student', 'parent', 'hod', 'hoy');

-- 2. Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  must_change_password BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function for role checking (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role), '{}')
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- 5. Teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  name TEXT NOT NULL,
  code TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  joining_date DATE,
  state TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- 6. Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  enrollment_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  nationality TEXT,
  form TEXT NOT NULL,
  state TEXT DEFAULT 'active',
  admission_date DATE,
  academic_year TEXT DEFAULT '2026',
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 7. Parents table
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  name TEXT NOT NULL,
  relation TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- 8. Parent-Student mapping
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(parent_id, student_id)
);
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- 9. Subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  max_marks NUMERIC DEFAULT 100,
  min_marks NUMERIC DEFAULT 0,
  is_practical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- 10. Subject-Teacher mapping
CREATE TABLE public.subject_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(subject_id, teacher_id)
);
ALTER TABLE public.subject_teachers ENABLE ROW LEVEL SECURITY;

-- 11. HOD assignments (teacher → department)
CREATE TABLE public.hod_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  department TEXT NOT NULL,
  UNIQUE(teacher_id, department)
);
ALTER TABLE public.hod_assignments ENABLE ROW LEVEL SECURITY;

-- 12. HOY assignments (teacher → form/year)
CREATE TABLE public.hoy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  form TEXT NOT NULL,
  UNIQUE(teacher_id, form)
);
ALTER TABLE public.hoy_assignments ENABLE ROW LEVEL SECURITY;

-- 13. Announcements / Events
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'announcement', -- 'announcement' or 'event'
  event_date DATE,
  created_by UUID REFERENCES auth.users(id),
  visible_to app_role[] DEFAULT '{admin,teacher,student,parent,hod,hoy}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 14. Attendance
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', -- present, absent, late, excused
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 15. Assignments
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id),
  form TEXT NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  due_date TIMESTAMPTZ,
  total_marks NUMERIC,
  submission_type TEXT DEFAULT 'file',
  allow_late BOOLEAN DEFAULT false,
  state TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- 16. Submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  submission_text TEXT,
  submission_file TEXT,
  is_late BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'submitted',
  obtained_marks NUMERIC,
  teacher_comment TEXT,
  graded_by UUID REFERENCES auth.users(id),
  UNIQUE(assignment_id, student_id)
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 17. Exam results
CREATE TABLE public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  exam_name TEXT NOT NULL,
  obtained_marks NUMERIC NOT NULL,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  teacher_id UUID REFERENCES public.teachers(id),
  state TEXT DEFAULT 'done',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- 18. Admission enquiries (public)
CREATE TABLE public.admission_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  nationality TEXT,
  parent_name TEXT NOT NULL,
  parent_email TEXT,
  parent_phone TEXT,
  form_applying TEXT NOT NULL,
  previous_school TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admission_enquiries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles: users can read own, admins can read all
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User roles: admins manage, users read own
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Teachers: admins full access, teachers read own, hod read dept
CREATE POLICY "Authenticated can read teachers" ON public.teachers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teachers" ON public.teachers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Students: admins full, teachers read their form students, students read own
CREATE POLICY "Authenticated can read students" ON public.students
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can update own" ON public.students
  FOR UPDATE USING (auth.uid() = user_id);

-- Parents: admins full, parents read own
CREATE POLICY "Parents can read own" ON public.parents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage parents" ON public.parents
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Parent-Students: parents read own mappings
CREATE POLICY "Parents can read own mappings" ON public.parent_students
  FOR SELECT USING (
    parent_id IN (SELECT id FROM public.parents WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can manage parent_students" ON public.parent_students
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Subjects: all authenticated can read
CREATE POLICY "Authenticated can read subjects" ON public.subjects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Subject teachers: all authenticated can read
CREATE POLICY "Authenticated can read subject_teachers" ON public.subject_teachers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subject_teachers" ON public.subject_teachers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- HOD/HOY assignments: all authenticated can read
CREATE POLICY "Authenticated can read hod_assignments" ON public.hod_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage hod_assignments" ON public.hod_assignments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read hoy_assignments" ON public.hoy_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage hoy_assignments" ON public.hoy_assignments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Announcements: all authenticated can read
CREATE POLICY "Authenticated can read announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and teachers can manage announcements" ON public.announcements
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  );

-- Attendance: teachers can manage, students read own, admins full
CREATE POLICY "Teachers can manage attendance" ON public.attendance
  FOR ALL USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students can read own attendance" ON public.attendance
  FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can manage attendance" ON public.attendance
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD can read attendance" ON public.attendance
  FOR SELECT USING (public.has_role(auth.uid(), 'hod'));
CREATE POLICY "HOY can read attendance" ON public.attendance
  FOR SELECT USING (public.has_role(auth.uid(), 'hoy'));

-- Assignments: teachers manage own, students read published
CREATE POLICY "Teachers can manage own assignments" ON public.assignments
  FOR ALL USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  );
CREATE POLICY "Students can read published assignments" ON public.assignments
  FOR SELECT USING (
    state = 'published' AND
    form IN (SELECT form FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can manage assignments" ON public.assignments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Submissions: students manage own, teachers read for their assignments
CREATE POLICY "Students can manage own submissions" ON public.submissions
  FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY "Teachers can read submissions for own assignments" ON public.submissions
  FOR SELECT USING (
    assignment_id IN (
      SELECT id FROM public.assignments
      WHERE teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Teachers can update submissions" ON public.submissions
  FOR UPDATE USING (
    assignment_id IN (
      SELECT id FROM public.assignments
      WHERE teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Admins can manage submissions" ON public.submissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Exam results: teachers manage, students read own, parents read own kids
CREATE POLICY "Authenticated can read exam_results" ON public.exam_results
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage exam_results" ON public.exam_results
  FOR ALL USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can manage exam_results" ON public.exam_results
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admission enquiries: public can insert, admins can manage
CREATE POLICY "Anyone can submit enquiry" ON public.admission_enquiries
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins can manage enquiries" ON public.admission_enquiries
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can read enquiries" ON public.admission_enquiries
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- Trigger for auto-creating profile on signup
-- =============================================
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
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
