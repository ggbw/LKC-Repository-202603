import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useProfiles, useUserRoles, useTeachers, useStudents, useParents, useInvalidate } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { downloadExcel, downloadCSV } from '@/lib/excel';
import { Card, Badge, Btn, SearchBar, FilterSelect,
  Modal, ModalHead, ModalBody, ModalFoot, Field, FieldInput, FieldSelect } from '@/components/SharedUI';

type RoleFilter = 'all' | 'admin' | 'teacher' | 'student' | 'parent' | 'no-account';

interface UnifiedUser {
  id: string;
  name: string;
  email: string | null;
  roles: string[];
  hasAccount: boolean;
  mustChangePassword: boolean;
  userId: string | null; // auth user id
  profileId: string | null;
  source: ('profile' | 'teacher' | 'student' | 'parent')[];
  createdAt: string | null;
  form?: string | null;
  department?: string | null;
}

export default function UserManagementPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useApp();
  const { data: profiles = [], isLoading: pLoading } = useProfiles();
  const { data: userRoles = [] } = useUserRoles();
  const { data: teachers = [], isLoading: tLoading } = useTeachers();
  const { data: students = [], isLoading: sLoading } = useStudents();
  const { data: parents = [], isLoading: prLoading } = useParents();
  const invalidate = useInvalidate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [modal, setModal] = useState(false);
  const [resetModal, setResetModal] = useState<any>(null);
  const [newUsers, setNewUsers] = useState<{ email: string; password: string; name: string; role: string }[]>([]);

  const isLoading = pLoading || tLoading || sLoading || prLoading;

  const getRoles = (userId: string) => userRoles.filter((r: any) => r.user_id === userId).map((r: any) => r.role);

  // Build unified user list
  const unifiedUsers = useMemo(() => {
    const userMap = new Map<string, UnifiedUser>();

    // 1. Add all profiles (users with accounts)
    profiles.forEach((p: any) => {
      const key = p.user_id;
      userMap.set(key, {
        id: key,
        name: p.full_name,
        email: p.email,
        roles: getRoles(p.user_id),
        hasAccount: true,
        mustChangePassword: p.must_change_password ?? false,
        userId: p.user_id,
        profileId: p.id,
        source: ['profile'],
        createdAt: p.created_at,
      });
    });

    // 2. Cross-reference teachers
    teachers.forEach((t: any) => {
      if (t.user_id && userMap.has(t.user_id)) {
        const existing = userMap.get(t.user_id)!;
        existing.source.push('teacher');
        existing.department = t.department;
      } else {
        // Teacher without account
        const key = `teacher-${t.id}`;
        userMap.set(key, {
          id: key,
          name: t.name,
          email: t.email,
          roles: ['teacher'],
          hasAccount: false,
          mustChangePassword: false,
          userId: null,
          profileId: null,
          source: ['teacher'],
          createdAt: t.created_at,
          department: t.department,
        });
      }
    });

    // 3. Cross-reference students
    students.forEach((s: any) => {
      if (s.user_id && userMap.has(s.user_id)) {
        const existing = userMap.get(s.user_id)!;
        existing.source.push('student');
        existing.form = s.form;
      } else {
        const key = `student-${s.id}`;
        userMap.set(key, {
          id: key,
          name: s.full_name,
          email: s.email,
          roles: ['student'],
          hasAccount: false,
          mustChangePassword: false,
          userId: null,
          profileId: null,
          source: ['student'],
          createdAt: s.created_at,
          form: s.form,
        });
      }
    });

    // 4. Cross-reference parents
    parents.forEach((pr: any) => {
      if (pr.user_id && userMap.has(pr.user_id)) {
        const existing = userMap.get(pr.user_id)!;
        existing.source.push('parent');
      } else {
        const key = `parent-${pr.id}`;
        userMap.set(key, {
          id: key,
          name: pr.name,
          email: pr.email,
          roles: ['parent'],
          hasAccount: false,
          mustChangePassword: false,
          userId: null,
          profileId: null,
          source: ['parent'],
          createdAt: pr.created_at,
        });
      }
    });

    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, teachers, students, parents, userRoles]);

  // Filter
  const rows = useMemo(() => {
    return unifiedUsers.filter(u => {
      if (search) {
        const s = search.toLowerCase();
        if (!u.name?.toLowerCase().includes(s) && !u.email?.toLowerCase().includes(s)) return false;
      }
      if (roleFilter === 'no-account') return !u.hasAccount;
      if (roleFilter !== 'all') return u.roles.includes(roleFilter) || u.source.includes(roleFilter as any);
      return true;
    });
  }, [unifiedUsers, search, roleFilter]);

  const counts = useMemo(() => ({
    all: unifiedUsers.length,
    teacher: unifiedUsers.filter(u => u.roles.includes('teacher') || u.source.includes('teacher')).length,
    student: unifiedUsers.filter(u => u.roles.includes('student') || u.source.includes('student')).length,
    parent: unifiedUsers.filter(u => u.roles.includes('parent') || u.source.includes('parent')).length,
    admin: unifiedUsers.filter(u => u.roles.includes('admin')).length,
    noAccount: unifiedUsers.filter(u => !u.hasAccount).length,
  }), [unifiedUsers]);

  const downloadCredentials = () => {
    if (newUsers.length === 0) { showToast('No new credentials to download', 'info'); return; }
    downloadCSV(newUsers.map(u => ({ Name: u.name, Email: u.email, Password: u.password, Role: u.role })), 'lkc_user_credentials');
    showToast('Credentials downloaded');
  };
  const downloadAllUsers = () => {
    const data = unifiedUsers.map(u => ({
      Name: u.name, Email: u.email || '', Roles: u.roles.join(', '),
      'Has Account': u.hasAccount ? 'Yes' : 'No',
      'Must Change Password': u.mustChangePassword ? 'Yes' : 'No',
      'Created At': u.createdAt?.split('T')[0] || '',
    }));
    downloadExcel(data, 'lkc_all_users', 'Users');
    showToast('Users exported');
  };

  if (!isAdmin) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Access denied</div></div>;

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  const filterTabs: { key: RoleFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'teacher', label: 'Teachers', count: counts.teacher },
    { key: 'student', label: 'Students', count: counts.student },
    { key: 'parent', label: 'Parents', count: counts.parent },
    { key: 'admin', label: 'Admins', count: counts.admin },
    { key: 'no-account', label: 'No Account', count: counts.noAccount },
  ];

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold"><i className="fas fa-user-cog mr-2" />User Management</div>
          <div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>
            {counts.all} total · {counts.noAccount > 0 && <span style={{ color: '#cf222e' }}>{counts.noAccount} without accounts</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={downloadAllUsers}><i className="fas fa-download mr-1" />Export</Btn>
          {newUsers.length > 0 && <Btn variant="purple" onClick={downloadCredentials}><i className="fas fa-key mr-1" />Credentials ({newUsers.length})</Btn>}
          <Btn onClick={() => setModal(true)}><i className="fas fa-plus mr-1" />Create User</Btn>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {filterTabs.map(t => (
          <button key={t.key} onClick={() => setRoleFilter(t.key)}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer border-none transition-all"
            style={{
              background: roleFilter === t.key ? 'hsl(var(--primary))' : 'hsl(var(--surface2))',
              color: roleFilter === t.key ? '#fff' : 'hsl(var(--text2))',
            }}>
            {t.label} <span className="ml-1 opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search users..." />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Name', 'Email', 'Roles', 'Account', 'Details', 'Actions'].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <td className="py-2.5 px-3.5 font-semibold">{u.name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{u.email || <span style={{ color: 'hsl(var(--text3))' }}>—</span>}</td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length > 0 ? u.roles.map((r: string) => (
                        <span key={r} className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>{r}</span>
                      )) : <span className="text-[10px]" style={{ color: 'hsl(var(--text3))' }}>No roles</span>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5">
                    {u.hasAccount ? (
                      <Badge status={u.mustChangePassword ? 'pending' : 'done'} />
                    ) : (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: '#ffebe9', color: '#cf222e', border: '1px solid #ffcecb' }}>No Account</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 text-[11px]" style={{ color: 'hsl(var(--text2))' }}>
                    {u.form && <span className="mr-2">Form {u.form}</span>}
                    {u.department && <span>{u.department}</span>}
                    {!u.form && !u.department && <span>{u.createdAt?.split('T')[0] || '—'}</span>}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex gap-1">
                      {u.hasAccount ? (
                        <Btn variant="outline" size="sm" onClick={() => setResetModal({ full_name: u.name, email: u.email, user_id: u.userId })}>
                          <i className="fas fa-key mr-1" />Reset PW
                        </Btn>
                      ) : (
                        <Btn size="sm" onClick={() => setModal(true)}>
                          <i className="fas fa-user-plus mr-1" />Create Account
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-[12px]" style={{ color: 'hsl(var(--text3))' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && <CreateUserModal onClose={(created) => {
        setModal(false);
        if (created) {
          setNewUsers(prev => [...prev, created]);
          invalidate(['profiles', 'user_roles', 'teachers', 'students', 'parents']);
        }
      }} />}

      {resetModal && <ResetPasswordModal profile={resetModal} onClose={() => { setResetModal(null); invalidate(['profiles']); }} />}
    </div>
  );
}

function ResetPasswordModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const { showToast } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const generatePassword = () => {
    const first = profile.full_name?.split(' ')[0]?.toLowerCase() || 'user';
    return first + Math.floor(1000 + Math.random() * 9000);
  };

  const save = async () => {
    const pw = newPassword || generatePassword();
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { action: 'reset_password', user_id: profile.user_id, new_password: pw },
    });
    if (error || data?.error) {
      showToast(data?.error || error?.message || 'Failed', 'error');
      setSaving(false);
      return;
    }
    showToast(`Password reset for ${profile.full_name}. New password: ${pw}`);
    onClose();
  };

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHead title="Reset Password" onClose={onClose} />
      <ModalBody>
        <div className="text-xs mb-3" style={{ color: 'hsl(var(--text2))' }}>
          Reset password for <strong>{profile.full_name}</strong> ({profile.email})
        </div>
        <Field label="New Password (leave blank for auto-generated)">
          <FieldInput value={newPassword} onChange={setNewPassword} type="text" placeholder="Auto-generate" />
        </Field>
        <div className="rounded-md px-3 py-2 text-[11px]" style={{ background: '#fff8c5', border: '1px solid #ffe07c', color: '#9a6700' }}>
          ⚠ User will be required to change password on next login.
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Resetting…' : 'Reset Password'}</Btn>
      </ModalFoot>
    </Modal>
  );
}

function CreateUserModal({ onClose }: { onClose: (created?: { email: string; password: string; name: string; role: string }) => void }) {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('teacher');
  const [saving, setSaving] = useState(false);

  const generatePassword = (fullName: string) => {
    const first = fullName.split(' ')[0]?.toLowerCase() || 'user';
    return first + Math.floor(1000 + Math.random() * 9000);
  };

  const save = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    const password = generatePassword(name);
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email, password, full_name: name, role },
    });
    if (error || data?.error) {
      showToast(data?.error || error?.message || 'Failed to create user', 'error');
      setSaving(false);
      return;
    }
    showToast(`User "${name}" created with password: ${password}`);
    onClose({ email, password, name, role });
  };

  return (
    <Modal onClose={() => onClose()}>
      <ModalHead title="Create User Account" onClose={() => onClose()} />
      <ModalBody>
        <Field label="Full Name" required><FieldInput value={name} onChange={setName} /></Field>
        <Field label="Email" required><FieldInput value={email} onChange={setEmail} type="email" /></Field>
        <Field label="Role" required>
          <FieldSelect value={role} onChange={setRole} options={[
            { value: 'admin', label: 'Admin' }, { value: 'teacher', label: 'Teacher' },
            { value: 'student', label: 'Student' }, { value: 'parent', label: 'Parent' },
          ]} />
        </Field>
        <div className="rounded-md px-3 py-2 text-[11px]" style={{ background: '#ddf4ff', border: '1px solid #addcff', color: '#0969da' }}>
          ℹ A random password will be generated. Download credentials after creation.
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={() => onClose()}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create User'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
