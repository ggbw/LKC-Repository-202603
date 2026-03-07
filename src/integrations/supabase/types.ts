export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admission_enquiries: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          form_applying: string
          gender: string | null
          id: string
          nationality: string | null
          notes: string | null
          parent_email: string | null
          parent_name: string
          parent_phone: string | null
          previous_school: string | null
          status: string | null
          student_name: string
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          form_applying: string
          gender?: string | null
          id?: string
          nationality?: string | null
          notes?: string | null
          parent_email?: string | null
          parent_name: string
          parent_phone?: string | null
          previous_school?: string | null
          status?: string | null
          student_name: string
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          form_applying?: string
          gender?: string | null
          id?: string
          nationality?: string | null
          notes?: string | null
          parent_email?: string | null
          parent_name?: string
          parent_phone?: string | null
          previous_school?: string | null
          status?: string | null
          student_name?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          event_date: string | null
          id: string
          title: string
          type: string | null
          visible_to: Database["public"]["Enums"]["app_role"][] | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          event_date?: string | null
          id?: string
          title: string
          type?: string | null
          visible_to?: Database["public"]["Enums"]["app_role"][] | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          event_date?: string | null
          id?: string
          title?: string
          type?: string | null
          visible_to?: Database["public"]["Enums"]["app_role"][] | null
        }
        Relationships: []
      }
      assignments: {
        Row: {
          allow_late: boolean | null
          attachment_name: string | null
          attachment_url: string | null
          class_name: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          form: string
          id: string
          show_on_report_card: boolean | null
          state: string | null
          subject_id: string | null
          submission_type: string | null
          teacher_id: string
          title: string
          total_marks: number | null
        }
        Insert: {
          allow_late?: boolean | null
          attachment_name?: string | null
          attachment_url?: string | null
          class_name?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          form: string
          id?: string
          show_on_report_card?: boolean | null
          state?: string | null
          subject_id?: string | null
          submission_type?: string | null
          teacher_id: string
          title: string
          total_marks?: number | null
        }
        Update: {
          allow_late?: boolean | null
          attachment_name?: string | null
          attachment_url?: string | null
          class_name?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          form?: string
          id?: string
          show_on_report_card?: boolean | null
          state?: string | null
          subject_id?: string | null
          submission_type?: string | null
          teacher_id?: string
          title?: string
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string | null
          date: string
          id: string
          marked_by: string | null
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          marked_by?: string | null
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_teachers: {
        Row: {
          class_name: string
          form: string
          id: string
          teacher_id: string
        }
        Insert: {
          class_name: string
          form: string
          id?: string
          teacher_id: string
        }
        Update: {
          class_name?: string
          form?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          created_at: string | null
          exam_name: string
          id: string
          long_comment: string | null
          max_marks: number
          obtained_marks: number
          short_comment: string | null
          state: string | null
          student_id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          exam_name: string
          id?: string
          long_comment?: string | null
          max_marks?: number
          obtained_marks: number
          short_comment?: string | null
          state?: string | null
          student_id: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          exam_name?: string
          id?: string
          long_comment?: string | null
          max_marks?: number
          obtained_marks?: number
          short_comment?: string | null
          state?: string | null
          student_id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_name: string | null
          created_at: string | null
          end_date: string | null
          form: string
          id: string
          name: string
          show_on_report_card: boolean | null
          start_date: string | null
          state: string | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string | null
          end_date?: string | null
          form?: string
          id?: string
          name: string
          show_on_report_card?: boolean | null
          start_date?: string | null
          state?: string | null
        }
        Update: {
          class_name?: string | null
          created_at?: string | null
          end_date?: string | null
          form?: string
          id?: string
          name?: string
          show_on_report_card?: boolean | null
          start_date?: string | null
          state?: string | null
        }
        Relationships: []
      }
      hod_assignments: {
        Row: {
          department: string
          id: string
          teacher_id: string
        }
        Insert: {
          department: string
          id?: string
          teacher_id: string
        }
        Update: {
          department?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      hoy_assignments: {
        Row: {
          form: string
          id: string
          teacher_id: string
        }
        Insert: {
          form: string
          id?: string
          teacher_id: string
        }
        Update: {
          form?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoy_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          relation: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          relation?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          relation?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          must_change_password: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          must_change_password?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          must_change_password?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_subjects: {
        Row: {
          id: string
          student_id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          id?: string
          student_id: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_year: string | null
          admission_date: string | null
          class_name: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          enrollment_number: string | null
          form: string
          full_name: string
          gender: string | null
          id: string
          nationality: string | null
          state: string | null
          user_id: string | null
        }
        Insert: {
          academic_year?: string | null
          admission_date?: string | null
          class_name?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_number?: string | null
          form: string
          full_name: string
          gender?: string | null
          id?: string
          nationality?: string | null
          state?: string | null
          user_id?: string | null
        }
        Update: {
          academic_year?: string | null
          admission_date?: string | null
          class_name?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_number?: string | null
          form?: string
          full_name?: string
          gender?: string | null
          id?: string
          nationality?: string | null
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subject_teachers: {
        Row: {
          id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_teachers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_practical: boolean | null
          max_marks: number | null
          min_marks: number | null
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_practical?: boolean | null
          max_marks?: number | null
          min_marks?: number | null
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_practical?: boolean | null
          max_marks?: number | null
          min_marks?: number | null
          name?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          assignment_id: string
          graded_by: string | null
          id: string
          is_late: boolean | null
          obtained_marks: number | null
          status: string | null
          student_id: string
          submission_file: string | null
          submission_text: string | null
          submitted_at: string | null
          teacher_comment: string | null
        }
        Insert: {
          assignment_id: string
          graded_by?: string | null
          id?: string
          is_late?: boolean | null
          obtained_marks?: number | null
          status?: string | null
          student_id: string
          submission_file?: string | null
          submission_text?: string | null
          submitted_at?: string | null
          teacher_comment?: string | null
        }
        Update: {
          assignment_id?: string
          graded_by?: string | null
          id?: string
          is_late?: boolean | null
          obtained_marks?: number | null
          status?: string | null
          student_id?: string
          submission_file?: string | null
          submission_text?: string | null
          submitted_at?: string | null
          teacher_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          code: string | null
          created_at: string | null
          department: string | null
          email: string | null
          id: string
          joining_date: string | null
          name: string
          phone: string | null
          state: string | null
          user_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          joining_date?: string | null
          name: string
          phone?: string | null
          state?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          joining_date?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student" | "parent" | "hod" | "hoy"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student", "parent", "hod", "hoy"],
    },
  },
} as const
