UPDATE public.student_subjects ss
SET teacher_id = (
  SELECT st.teacher_id
  FROM public.subject_teachers st
  JOIN public.teachers t ON t.id = st.teacher_id
  WHERE st.subject_id = ss.subject_id
  ORDER BY t.name
  LIMIT 1
)
WHERE
  (
    ss.teacher_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.subject_teachers st2
      WHERE st2.subject_id = ss.subject_id
        AND st2.teacher_id = ss.teacher_id
    )
  )
  AND EXISTS (
    SELECT 1 FROM public.subject_teachers st3
    WHERE st3.subject_id = ss.subject_id
  );