import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useStudentSubjects, useSubjectTeachers, useClassTeachers, useStudents, useTeachers } from '@/hooks/useSupabaseData';
import { Card, InfoRow, Btn, Field, FieldInput } from '@/components/SharedUI';

export default function ProfilePage() {
  const { user, profile, roles, isStudent, isTeacher, refreshProfile } = useAuth();
  const { showToast } = useApp();
  const { data: teachers = [] } = useTeachers();
  const { data: students = [] } = useStudents();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: classTeachers = [] } = useClassTeachers();

  const [changingPw, setChangingPw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);

  // Find student record for current user
  const myStudent = students.find((s: any) => s.user_id === user?.id);
  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);

  // Student's subjects and their teachers
  const { data: mySubjects = [] } = useStudentSubjects(myStudent?.id);

  // My class teacher
  const myClassTeacher = myStudent ? classTeachers.find((ct: any) => ct.form === myStudent.form && ct.class_name === myStudent.class_name) : null;

  // Teacher's students (via subject_teachers)
  const mySubjectIds = myTeacher ? subjectTeachers.filter((st: any) => st.teacher_id === myTeacher.id).map((st: any) => st.subject_id) : [];

  // Classes I'm class teacher of
  const myClasses = myTeacher ? classTeachers.filter((ct: any) => ct.teacher_id === myTeacher.id) : [];

  const handleChangePassword = async () => {
    if (newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { showToast(error.message, 'error'); setSaving(false); return; }
    showToast('Password updated successfully');
    setChangingPw(false);
    setNewPw('');
    setConfirmPw('');
    setSaving(false);
  };

  return (
    <div className="page-animate">
      <div className="text-lg font-bold mb-4"><i className="fas fa-user-circle mr-2" />My Profile</div>

      <div className="grid grid-cols-2 gap-4">
        <Card title={<><i className="fas fa-id-card mr-1.5" />Account Information</>}>
          <InfoRow label="Name" value={profile?.full_name || '—'} />
          <InfoRow label="Email" value={profile?.email || '—'} />
          <InfoRow label="Roles" value={roles.join(', ').toUpperCase() || '—'} />
        </Card>

        <Card title={<><i className="fas fa-key mr-1.5" />Security</>}>
          {!changingPw ? (
            <div>
              <div className="text-xs mb-3" style={{ color: 'hsl(var(--text2))' }}>You can change your password at any time.</div>
              <Btn onClick={() => setChangingPw(true)}><i className="fas fa-lock mr-1" />Change Password</Btn>
            </div>
          ) : (
            <div>
              <Field label="New Password" required><FieldInput value={newPw} onChange={setNewPw} type="password" /></Field>
              <Field label="Confirm Password" required><FieldInput value={confirmPw} onChange={setConfirmPw} type="password" /></Field>
              <div className="flex gap-2">
                <Btn onClick={handleChangePassword} disabled={saving}>{saving ? 'Saving…' : 'Update Password'}</Btn>
                <Btn variant="outline" onClick={() => { setChangingPw(false); setNewPw(''); setConfirmPw(''); }}>Cancel</Btn>
              </div>
            </div>
          )}
        </Card>

        {isStudent && myStudent && (
          <>
            <Card title={<><i className="fas fa-school mr-1.5" />My Class</>}>
              <InfoRow label="Form" value={myStudent.form} />
              <InfoRow label="Class" value={myStudent.class_name || '—'} />
              <InfoRow label="Class Teacher" value={myClassTeacher?.teachers?.name || 'Not assigned'} />
              <InfoRow label="Enrollment #" value={myStudent.enrollment_number || '—'} />
            </Card>

            <Card title={<><i className="fas fa-book mr-1.5" />My Subjects ({mySubjects.length})</>}>
              {mySubjects.length === 0 ? (
                <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No subjects assigned yet</div>
              ) : (
                mySubjects.map((ss: any) => {
                  const teacherMappings = subjectTeachers.filter((st: any) => st.subject_id === ss.subject_id);
                  return (
                    <div key={ss.id} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
                      <span className="font-semibold">{ss.subjects?.name}</span>
                      <span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>
                        {teacherMappings.map((tm: any) => tm.teachers?.name).filter(Boolean).join(', ') || '—'}
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
            <Card title={<><i className="fas fa-chalkboard mr-1.5" />My Classes</>}>
              {myClasses.length === 0 ? (
                <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>Not assigned as class teacher</div>
              ) : (
                myClasses.map((ct: any) => (
                  <div key={ct.id} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <span className="font-semibold">{ct.form} {ct.class_name}</span>
                    <span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>Class Teacher</span>
                  </div>
                ))
              )}
            </Card>

            <Card title={<><i className="fas fa-book mr-1.5" />My Subjects</>}>
              {mySubjectIds.length === 0 ? (
                <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No subjects assigned</div>
              ) : (
                subjectTeachers.filter((st: any) => st.teacher_id === myTeacher.id).map((st: any) => (
                  <div key={st.id} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <span className="font-semibold">{st.subjects?.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: 'hsl(var(--text3))' }}>{st.subjects?.code}</span>
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
