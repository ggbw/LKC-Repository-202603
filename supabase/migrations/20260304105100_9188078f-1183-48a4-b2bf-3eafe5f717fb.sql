
-- Update form references: Form 6 → Form 5, Form 7 → Form 6
UPDATE students SET form = 'Form 5' WHERE form = 'Form 6';
UPDATE students SET form = 'Form 6' WHERE form = 'Form 7';
UPDATE hoy_assignments SET form = 'Form 5' WHERE form = 'Form 6';
UPDATE hoy_assignments SET form = 'Form 6' WHERE form = 'Form 7';

-- Student-subject mapping table
CREATE TABLE IF NOT EXISTS student_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(student_id, subject_id)
);
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_ss_admin ON student_subjects FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY p_ss_read ON student_subjects FOR SELECT TO authenticated USING (true);

-- Exams table
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  form text NOT NULL DEFAULT 'All Forms',
  state text DEFAULT 'draft',
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_exams_admin ON exams FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY p_exams_hod ON exams FOR ALL TO authenticated USING (has_role(auth.uid(), 'hod'::app_role));
CREATE POLICY p_exams_read ON exams FOR SELECT TO authenticated USING (true);

-- Sample exams
INSERT INTO exams (name, form, state, start_date, end_date) VALUES
('Mid-Term 1 2026', 'All Forms', 'confirmed', '2026-03-01', '2026-03-07'),
('End of Term 1 2026', 'All Forms', 'draft', '2026-04-20', '2026-04-28'),
('Mid-Term 2 2026', 'All Forms', 'draft', '2026-06-15', '2026-06-21'),
('End of Term 2 2026', 'All Forms', 'draft', '2026-08-10', '2026-08-18');

-- Sample assignments
DO $$
DECLARE
  t_id uuid;
  s1_id uuid;
  s2_id uuid;
  s3_id uuid;
BEGIN
  SELECT id INTO t_id FROM teachers LIMIT 1;
  IF t_id IS NULL THEN RETURN; END IF;
  SELECT id INTO s1_id FROM subjects ORDER BY name LIMIT 1;
  SELECT id INTO s2_id FROM subjects ORDER BY name OFFSET 1 LIMIT 1;
  SELECT id INTO s3_id FROM subjects ORDER BY name OFFSET 2 LIMIT 1;
  
  INSERT INTO assignments (title, form, teacher_id, subject_id, due_date, state, total_marks, description) VALUES
    ('Mathematics Practice Set 1', 'Form 1', t_id, s1_id, '2026-03-15 23:59:00+00', 'published', 50, 'Complete exercises 1-20 from Chapter 3'),
    ('Science Lab Report', 'Form 2', t_id, COALESCE(s2_id, s1_id), '2026-03-20 23:59:00+00', 'published', 100, 'Submit lab report for Experiment 5'),
    ('English Essay', 'Form 3', t_id, COALESCE(s3_id, s1_id), '2026-03-25 23:59:00+00', 'draft', 40, 'Write a 500-word essay on Climate Change'),
    ('History Research Project', 'Form 4', t_id, s1_id, '2026-04-01 23:59:00+00', 'draft', 80, 'Research and present on a historical event');
END;
$$;

-- Sample exam results
INSERT INTO exam_results (exam_name, student_id, subject_id, obtained_marks, max_marks, state)
SELECT 'Mid-Term 1 2026', s.id, sub.id,
  floor(random() * 40 + 55)::int, 100, 'done'
FROM (SELECT id FROM students ORDER BY random() LIMIT 10) s
CROSS JOIN (SELECT id FROM subjects ORDER BY random() LIMIT 3) sub;
