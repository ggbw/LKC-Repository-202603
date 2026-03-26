import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStudents(form?: string) {
  return useQuery({
    queryKey: ["students", form],
    queryFn: async () => {
      let q = supabase.from("students").select("*").order("full_name");
      if (form) q = q.eq("form", form);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useParents() {
  return useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parents").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useParentStudents() {
  return useQuery({
    queryKey: ["parent_students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parent_students").select("*, parents(*), students(*)");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAttendance(date?: string) {
  return useQuery({
    queryKey: ["attendance", date],
    queryFn: async () => {
      let q = supabase.from("attendance").select("*, students(full_name, form, enrollment_number, class_name)");
      if (date) q = q.eq("date", date);
      const { data, error } = await q.order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useExamResults(examName?: string) {
  return useQuery({
    queryKey: ["exam_results", examName],
    queryFn: async () => {
      let q = supabase
        .from("exam_results")
        .select("*, students(full_name, form, enrollment_number, class_name), subjects(name, code), teachers(name)");
      if (examName) q = q.eq("exam_name", examName);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAssignments() {
  return useQuery({
    queryKey: ["assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*, subjects(name), teachers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSubmissions(assignmentId?: string) {
  return useQuery({
    queryKey: ["submissions", assignmentId],
    queryFn: async () => {
      let q = supabase
        .from("submissions")
        .select("*, students(full_name, enrollment_number, form), assignments(title, total_marks, subject_id)");
      if (assignmentId) q = q.eq("assignment_id", assignmentId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAdmissionEnquiries() {
  return useQuery({
    queryKey: ["admission_enquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_enquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("sort_order").order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSubjectTeachers() {
  return useQuery({
    queryKey: ["subject_teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_teachers")
        .select("*, subjects(name, code), teachers(name, code, department)");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useHODAssignments() {
  return useQuery({
    queryKey: ["hod_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hod_assignments").select("*, teachers(name)");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useHOYAssignments() {
  return useQuery({
    queryKey: ["hoy_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hoy_assignments").select("*, teachers(name)");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUserRoles() {
  return useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useExams() {
  return useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useStudentSubjects(studentId?: string) {
  return useQuery({
    queryKey: ["student_subjects", studentId],
    queryFn: async () => {
      let q = supabase
        .from("student_subjects")
        .select("*, students(full_name, form, class_name), subjects(name, code), teachers(name)")
        .limit(10000);
      if (studentId) q = q.eq("student_id", studentId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useClassTeachers() {
  return useQuery({
    queryKey: ["class_teachers"],
    queryFn: async () => {
      const { data, error } = (await supabase.from("class_teachers").select("*, teachers(name, code)")) as any;
      if (error) throw error;
      return data || [];
    },
  });
}

// Utility: invalidate queries
export function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      // Fetch from classes table
      const { data: classRows } = await (supabase as any).from("classes").select("*").order("form").order("name");
      // Also fetch distinct class_name/form from students as fallback
      const { data: studentRows } = (await supabase
        .from("students")
        .select("form, class_name")
        .not("class_name", "is", null)
        .neq("class_name", "")) as any;

      const merged = new Map<string, any>();
      (classRows || []).forEach((c: any) => {
        merged.set(`${c.form}__${c.name}`, c);
      });
      (studentRows || []).forEach((s: any) => {
        const key = `${s.form}__${s.class_name}`;
        if (!merged.has(key)) {
          merged.set(key, { id: key, form: s.form, name: s.class_name, _fromStudents: true });
        }
      });

      return Array.from(merged.values()).sort((a: any, b: any) => {
        if (a.form < b.form) return -1;
        if (a.form > b.form) return 1;
        return a.name.localeCompare(b.name);
      });
    },
  });
}

export function useAcademicYears() {
  return useQuery({
    queryKey: ["academic_years"],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("academic_years")
        .select("*")
        .order("year", { ascending: false })) as any;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useForms() {
  return useQuery({
    queryKey: ["forms"],
    queryFn: async () => {
      const { data, error } = (await supabase.from("forms").select("*").order("sort_order")) as any;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRequisitions(filters?: { requestorId?: string; status?: string }) {
  return useQuery({
    queryKey: ["requisitions", filters],
    queryFn: async () => {
      let q = (supabase as any).from("requisitions").select("*").order("created_at", { ascending: false });
      if (filters?.requestorId) q = q.eq("requestor_id", filters.requestorId);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRequisitionLogs(requisitionId?: string) {
  return useQuery({
    queryKey: ["requisition_logs", requisitionId],
    queryFn: async () => {
      let q = (supabase as any).from("requisition_logs").select("*").order("created_at", { ascending: true });
      if (requisitionId) q = q.eq("requisition_id", requisitionId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!requisitionId,
  });
}

export function useReqRoleMappings() {
  return useQuery({
    queryKey: ["req_role_mappings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("requisition_role_mappings").select("*").order("req_role");
      if (error) throw error;
      return data || [];
    },
  });
}
