import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "teacher" | "student" | "parent" | "hod" | "hoy";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  must_change_password: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Derived convenience
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
  isHOD: boolean;
  isHOY: boolean;
  isClassTeacher: boolean;
  myClassAssignments: { form: string; class_name: string }[];
  primaryRole: AppRole;
}

const AuthContext = createContext<AuthState>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [myClassAssignments, setMyClassAssignments] = useState<{ form: string; class_name: string }[]>([]);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    setProfile(prof as Profile | null);

    // Fetch roles using the security definer function
    const { data: rolesData } = await supabase.rpc("get_user_roles", { _user_id: userId });
    setRoles((rolesData as AppRole[]) || []);

    // Check if this user is a class teacher and fetch their class assignments
    const { data: teacherData } = await supabase.from("teachers").select("id").eq("user_id", userId).single();
    if (teacherData) {
      const { data: ctData } = await (supabase as any)
        .from("class_teachers")
        .select("form, class_name")
        .eq("teacher_id", (teacherData as any).id);
      setIsClassTeacher((ctData || []).length > 0);
      setMyClassAssignments((ctData || []).map((c: any) => ({ form: c.form, class_name: c.class_name })));
    } else {
      setIsClassTeacher(false);
      setMyClassAssignments([]);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Set up auth listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Use setTimeout to avoid deadlock with Supabase auth
        setTimeout(() => fetchProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchProfile(sess.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setIsClassTeacher(false);
  }, []);

  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("teacher");
  const isStudent = roles.includes("student");
  const isParent = roles.includes("parent");
  const isHOD = roles.includes("hod");
  const isHOY = roles.includes("hoy");

  // Primary role determines the main view
  const primaryRole: AppRole = isAdmin
    ? "admin"
    : isHOD
      ? "hod"
      : isHOY
        ? "hoy"
        : isTeacher
          ? "teacher"
          : isParent
            ? "parent"
            : "student";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        signOut,
        refreshProfile,
        isAdmin,
        isTeacher,
        isStudent,
        isParent,
        isHOD,
        isHOY,
        isClassTeacher,
        myClassAssignments,
        primaryRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
