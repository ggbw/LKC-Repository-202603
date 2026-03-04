import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useProfiles, useUserRoles, useInvalidate } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { cap } from '@/data/database';
import { downloadExcel, downloadCSV } from '@/lib/excel';
import { Card, Badge, Btn, SearchBar, FilterSelect,
  Modal, ModalHead, ModalBody, ModalFoot, Field, FieldInput, FieldSelect } from '@/components/SharedUI';

export default function UserManagementPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useApp();
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: userRoles = [] } = useUserRoles();
  const invalidate = useInvalidate();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState(false);
  const [newUsers, setNewUsers] = useState<{ email: string; password: string; name: string; role: string }[]>([]);

  if (!isAdmin) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Access denied</div></div>;

  const getRoles = (userId: string) => userRoles.filter((r: any) => r.user_id === userId).map((r: any) => r.role);

  const rows = profiles.filter((p: any) =>
    !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const downloadCredentials = () => {
    if (newUsers.length === 0) {
      showToast('No new credentials to download', 'info');
      return;
    }
    downloadCSV(newUsers.map(u => ({
      Name: u.name,
      Email: u.email,
      Password: u.password,
      Role: u.role,
    })), 'lkc_user_credentials');
    showToast('Credentials downloaded');
  };

  const downloadAllUsers = () => {
    const data = profiles.map((p: any) => ({
      Name: p.full_name,
      Email: p.email,
      Roles: getRoles(p.user_id).join(', '),
      'Must Change Password': p.must_change_password ? 'Yes' : 'No',
      'Created At': p.created_at,
    }));
    downloadExcel(data, 'lkc_all_users', 'Users');
    showToast('Users exported');
  };

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold">User Management</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{profiles.length} users</div></div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={downloadAllUsers}>⬇ Export Users</Btn>
          {newUsers.length > 0 && <Btn variant="purple" onClick={downloadCredentials}>🔑 Download Credentials ({newUsers.length})</Btn>}
          <Btn onClick={() => setModal(true)}>＋ Create User</Btn>
        </div>
      </div>

      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search users..." />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Name', 'Email', 'Roles', 'Password Status', 'Created'].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((p: any) => {
                const roles = getRoles(p.user_id);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <td className="py-2.5 px-3.5 font-semibold">{p.full_name}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{p.email}</td>
                    <td className="py-2.5 px-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {roles.length > 0 ? roles.map((r: string) => (
                          <span key={r} className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>{r}</span>
                        )) : <span className="text-[10px]" style={{ color: 'hsl(var(--text3))' }}>No roles</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <Badge status={p.must_change_password ? 'pending' : 'done'} />
                    </td>
                    <td className="py-2.5 px-3.5 text-[11px] font-mono" style={{ color: 'hsl(var(--text2))' }}>{p.created_at?.split('T')[0]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && <CreateUserModal onClose={(created) => {
        setModal(false);
        if (created) {
          setNewUsers(prev => [...prev, created]);
          invalidate(['profiles', 'user_roles']);
        }
      }} />}
    </div>
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

    // Create auth user via edge function
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
      <ModalHead title="👤 Create User Account" onClose={() => onClose()} />
      <ModalBody>
        <Field label="Full Name" required><FieldInput value={name} onChange={setName} /></Field>
        <Field label="Email" required><FieldInput value={email} onChange={setEmail} type="email" /></Field>
        <Field label="Role" required>
          <FieldSelect value={role} onChange={setRole} options={[
            { value: 'admin', label: 'Admin' },
            { value: 'teacher', label: 'Teacher' },
            { value: 'student', label: 'Student' },
            { value: 'parent', label: 'Parent' },
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
