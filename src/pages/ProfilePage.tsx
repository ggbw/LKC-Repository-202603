import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useStudentSubjects,
  useSubjectTeachers,
  useClassTeachers,
  useStudents,
  useTeachers,
} from "@/hooks/useSupabaseData";
import { Card, InfoRow, Btn, Field, FieldInput } from "@/components/SharedUI";

export default function ProfilePage() {
  const { user, profile, roles, isStudent, isTeacher, refreshProfile } = useAuth();
  const { showToast } = useApp();
  const { data: teachers = [] } = useTeachers();
  const { data: students = [] } = useStudents();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: classTeachers = [] } = useClassTeachers();

  // Password change state
  const [changingPw, setChangingPw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  // Email (username) change state
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const myStudent = students.find((s: any) => s.user_id === user?.id);
  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);
  const { data: mySubjects = [] } = useStudentSubjects(myStudent?.id);
  const myClassTeacher = myStudent
    ? classTeachers.find((ct: any) => ct.form === myStudent.form && ct.class_name === myStudent.class_name)
    : null;
  const mySubjectIds = myTeacher
    ? subjectTeachers.filter((st: any) => st.teacher_id === myTeacher.id).map((st: any) => st.subject_id)
    : [];
  const myClasses = myTeacher ? classTeachers.filter((ct: any) => ct.teacher_id === myTeacher.id) : [];

  const handleChangePassword = async () => {
    if (newPw.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    if (newPw !== confirmPw) {
      showToast("Passwords do not match", "error");
      return;
    }
    setSavingPw(true);
    // Re-authenticate first to verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: currentPw,
    });
    if (signInError) {
      showToast("Current password is incorrect", "error");
      setSavingPw(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      showToast(error.message, "error");
      setSavingPw(false);
      return;
    }
    showToast("Password updated successfully");
    setChangingPw(false);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setSavingPw(false);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    if (!emailPw) {
      showToast("Please enter your current password to confirm", "error");
      return;
    }
    setSavingEmail(true);
    // Verify current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: emailPw,
    });
    if (signInError) {
      showToast("Current password is incorrect", "error");
      setSavingEmail(false);
      return;
    }
    // Update email in auth
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      showToast(error.message, "error");
      setSavingEmail(false);
      return;
    }
    // Update profile table email
    await supabase.from("profiles").update({ email: newEmail }).eq("user_id", user!.id);
    // Update person record if linked
    if (myTeacher) await supabase.from("teachers").update({ email: newEmail }).eq("id", myTeacher.id);
    if (myStudent) await supabase.from("students").update({ email: newEmail }).eq("id", myStudent.id);
    await refreshProfile();
    showToast("Email updated. Check your new inbox for a confirmation link.");
    setChangingEmail(false);
    setNewEmail("");
    setEmailPw("");
    setSavingEmail(false);
  };

  return (
    <div className="page-animate">
      <div className="text-lg font-bold mb-4">
        <i className="fas fa-user-circle mr-2" />
        My Profile
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card
          title={
            <>
              <i className="fas fa-id-card mr-1.5" />
              Account Information
            </>
          }
        >
          <InfoRow label="Name" value={profile?.full_name || "—"} />
          <InfoRow label="Email / Username" value={profile?.email || user?.email || "—"} />
          <InfoRow label="Roles" value={roles.join(", ").toUpperCase() || "—"} />
        </Card>

        {/* ── Security Card ── */}
        <Card
          title={
            <>
              <i className="fas fa-key mr-1.5" />
              Security
            </>
          }
        >
          {/* Change Password */}
          {!changingPw && !changingEmail ? (
            <div className="space-y-2">
              <div className="text-xs mb-3" style={{ color: "hsl(var(--text2))" }}>
                Manage your login credentials below.
              </div>
              <Btn onClick={() => setChangingPw(true)} className="w-full">
                <i className="fas fa-lock mr-1" />
                Change Password
              </Btn>
              <Btn variant="outline" onClick={() => setChangingEmail(true)} className="w-full">
                <i className="fas fa-at mr-1" />
                Change Email / Username
              </Btn>
            </div>
          ) : changingPw ? (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: "hsl(var(--text2))" }}>
                Change Password
              </div>
              <Field label="Current Password" required>
                <FieldInput
                  value={currentPw}
                  onChange={setCurrentPw}
                  type="password"
                  placeholder="Enter current password"
                />
              </Field>
              <Field label="New Password" required>
                <FieldInput value={newPw} onChange={setNewPw} type="password" placeholder="At least 6 characters" />
              </Field>
              <Field label="Confirm New Password" required>
                <FieldInput value={confirmPw} onChange={setConfirmPw} type="password" />
              </Field>
              <div className="flex gap-2">
                <Btn onClick={handleChangePassword} disabled={savingPw}>
                  {savingPw ? "Saving…" : "Update Password"}
                </Btn>
                <Btn
                  variant="outline"
                  onClick={() => {
                    setChangingPw(false);
                    setCurrentPw("");
                    setNewPw("");
                    setConfirmPw("");
                  }}
                >
                  Cancel
                </Btn>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: "hsl(var(--text2))" }}>
                Change Email / Username
              </div>
              <div
                className="rounded-md px-3 py-2 text-[11px] mb-3"
                style={{ background: "#ddf4ff", border: "1px solid #addcff", color: "#0969da" }}
              >
                <i className="fas fa-info-circle mr-1" />
                Your email is your login username. After changing, you'll need to confirm your new email address.
              </div>
              <Field label="New Email Address" required>
                <FieldInput value={newEmail} onChange={setNewEmail} type="email" placeholder="new@email.com" />
              </Field>
              <Field label="Current Password (to confirm)" required>
                <FieldInput
                  value={emailPw}
                  onChange={setEmailPw}
                  type="password"
                  placeholder="Enter your current password"
                />
              </Field>
              <div className="flex gap-2">
                <Btn onClick={handleChangeEmail} disabled={savingEmail}>
                  {savingEmail ? "Updating…" : "Update Email"}
                </Btn>
                <Btn
                  variant="outline"
                  onClick={() => {
                    setChangingEmail(false);
                    setNewEmail("");
                    setEmailPw("");
                  }}
                >
                  Cancel
                </Btn>
              </div>
            </div>
          )}
        </Card>

        {isStudent && myStudent && (
          <>
            <Card
              title={
                <>
                  <i className="fas fa-school mr-1.5" />
                  My Class
                </>
              }
            >
              <InfoRow label="Form" value={myStudent.form} />
              <InfoRow label="Class" value={myStudent.class_name || "—"} />
              <InfoRow label="Class Teacher" value={myClassTeacher?.teachers?.name || "Not assigned"} />
              <InfoRow label="Enrollment #" value={myStudent.enrollment_number || "—"} />
            </Card>

            <Card
              title={
                <>
                  <i className="fas fa-book mr-1.5" />
                  My Subjects ({mySubjects.length})
                </>
              }
            >
              {mySubjects.length === 0 ? (
                <div className="text-xs" style={{ color: "hsl(var(--text3))" }}>
                  No subjects assigned yet
                </div>
              ) : (
                mySubjects.map((ss: any) => {
                  const teacherMappings = subjectTeachers.filter((st: any) => st.subject_id === ss.subject_id);
                  return (
                    <div
                      key={ss.id}
                      className="flex justify-between py-[7px] text-[12.5px]"
                      style={{ borderBottom: "1px solid #f6f8fa" }}
                    >
                      <span className="font-semibold">{ss.subjects?.name}</span>
                      <span className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                        {teacherMappings
                          .map((tm: any) => tm.teachers?.name)
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </span>
                    </div>
                  );
                })
              )}
            </Card>
          </>
        )}

        {isTeacher && myTeacher && (
          <>
            <Card
              title={
                <>
                  <i className="fas fa-chalkboard mr-1.5" />
                  My Classes
                </>
              }
            >
              {myClasses.length === 0 ? (
                <div className="text-xs" style={{ color: "hsl(var(--text3))" }}>
                  Not assigned as class teacher
                </div>
              ) : (
                myClasses.map((ct: any) => (
                  <div
                    key={ct.id}
                    className="flex justify-between py-[7px] text-[12.5px]"
                    style={{ borderBottom: "1px solid #f6f8fa" }}
                  >
                    <span className="font-semibold">
                      {ct.form} {ct.class_name}
                    </span>
                    <span className="text-[11px]" style={{ color: "hsl(var(--text2))" }}>
                      Class Teacher
                    </span>
                  </div>
                ))
              )}
            </Card>

            <Card
              title={
                <>
                  <i className="fas fa-book mr-1.5" />
                  My Subjects
                </>
              }
            >
              {mySubjectIds.length === 0 ? (
                <div className="text-xs" style={{ color: "hsl(var(--text3))" }}>
                  No subjects assigned
                </div>
              ) : (
                subjectTeachers
                  .filter((st: any) => st.teacher_id === myTeacher.id)
                  .map((st: any) => (
                    <div
                      key={st.id}
                      className="flex justify-between py-[7px] text-[12.5px]"
                      style={{ borderBottom: "1px solid #f6f8fa" }}
                    >
                      <span className="font-semibold">{st.subjects?.name}</span>
                      <span className="font-mono text-[10px]" style={{ color: "hsl(var(--text3))" }}>
                        {st.subjects?.code}
                      </span>
                    </div>
                  ))
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
