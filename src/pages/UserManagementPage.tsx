import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useProfiles, useUserRoles, useTeachers, useStudents, useParents, useInvalidate } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { downloadExcel, downloadCSV, parseExcel, triggerFileUpload } from '@/lib/excel';
import { Card, Badge, Btn, SearchBar,
  Modal, ModalHead, ModalBody, ModalFoot, Field, FieldInput, FieldSelect } from '@/components/SharedUI';

type RoleFilter = 'all' | 'admin' | 'teacher' | 'student' | 'parent' | 'no-account';

interface UnifiedUser {
  id: string;
  name: string;
  email: string | null;
  roles: string[];
  hasAccount: boolean;
  mustChangePassword: boolean;
  userId: string | null;
  profileId: string | null;
  source: ('profile' | 'teacher' | 'student' | 'parent')[];
  createdAt: string | null;
  form?: string | null;
  department?: string | null;
  linkTable?: string;
  linkId?: string;
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
  const [importModal, setImportModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [resetModal, setResetModal] = useState<any>(null);
  const [newUsers, setNewUsers] = useState<{ email: string; password: string; name: string; role: string }[]>([]);

  const isLoading = pLoading || tLoading || sLoading || prLoading;

  const getRoles = (userId: string) => userRoles.filter((r: any) => r.user_id === userId).map((r: any) => r.role);

  const unifiedUsers = useMemo(() => {
    const userMap = new Map<string, UnifiedUser>();

    profiles.forEach((p: any) => {
      const key = p.user_id;
      userMap.set(key, {
        id: key, name: p.full_name, email: p.email, roles: getRoles(p.user_id),
        hasAccount: true, mustChangePassword: p.must_change_password ?? false,
        userId: p.user_id, profileId: p.id, source: ['profile'], createdAt: p.created_at,
      });
    });

    teachers.forEach((t: any) => {
      if (t.user_id && userMap.has(t.user_id)) {
        const e = userMap.get(t.user_id)!;
        e.source.push('teacher'); e.department = t.department;
      } else {
        userMap.set(`teacher-${t.id}`, {
          id: `teacher-${t.id}`, name: t.name, email: t.email, roles: ['teacher'],
          hasAccount: false, mustChangePassword: false, userId: null, profileId: null,
          source: ['teacher'], createdAt: t.created_at, department: t.department,
          linkTable: 'teachers', linkId: t.id,
        });
      }
    });

    students.forEach((s: any) => {
      if (s.user_id && userMap.has(s.user_id)) {
        const e = userMap.get(s.user_id)!;
        e.source.push('student'); e.form = s.form;
      } else {
        userMap.set(`student-${s.id}`, {
          id: `student-${s.id}`, name: s.full_name, email: s.email, roles: ['student'],
          hasAccount: false, mustChangePassword: false, userId: null, profileId: null,
          source: ['student'], createdAt: s.created_at, form: s.form,
          linkTable: 'students', linkId: s.id,
        });
      }
    });

    parents.forEach((pr: any) => {
      if (pr.user_id && userMap.has(pr.user_id)) {
        userMap.get(pr.user_id)!.source.push('parent');
      } else {
        userMap.set(`parent-${pr.id}`, {
          id: `parent-${pr.id}`, name: pr.name, email: pr.email, roles: ['parent'],
          hasAccount: false, mustChangePassword: false, userId: null, profileId: null,
          source: ['parent'], createdAt: pr.created_at,
          linkTable: 'parents', linkId: pr.id,
        });
      }
    });

    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, teachers, students, parents, userRoles]);

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

  const usersWithoutAccounts = useMemo(() => unifiedUsers.filter(u => !u.hasAccount && u.email), [unifiedUsers]);

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

  const downloadTemplate = () => {
    downloadExcel([{ Name: 'John Doe', Email: 'john@school.com', Role: 'teacher' }], 'user_import_template', 'Template');
    showToast('Template downloaded');
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
            {counts.all} total{counts.noAccount > 0 && <> · <span style={{ color: '#cf222e' }}>{counts.noAccount} without accounts</span></>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="outline" onClick={downloadAllUsers}><i className="fas fa-download mr-1" />Export</Btn>
          <Btn variant="outline" onClick={() => setImportModal(true)}><i className="fas fa-file-import mr-1" />Import</Btn>
          {counts.noAccount > 0 && (
            <Btn variant="purple" onClick={() => setBulkModal(true)}>
              <i className="fas fa-users-cog mr-1" />Create All Accounts ({usersWithoutAccounts.length})
            </Btn>
          )}
          {newUsers.length > 0 && <Btn variant="purple" onClick={downloadCredentials}><i className="fas fa-key mr-1" />Credentials ({newUsers.length})</Btn>}
          <Btn onClick={() => setModal(true)}><i className="fas fa-plus mr-1" />Create User</Btn>
        </div>
      </div>

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
                        <Btn size="sm" onClick={async () => {
                          if (!u.email) { showToast('No email set for this user', 'error'); return; }
                          const password = (u.name.split(' ')[0]?.toLowerCase() || 'user') + Math.floor(1000 + Math.random() * 9000);
                          const { data, error } = await supabase.functions.invoke('create-user', {
                            body: { email: u.email, password, full_name: u.name, role: u.roles[0] || 'student', link_table: u.linkTable, link_id: u.linkId },
                          });
                          if (error || data?.error) { showToast(data?.error || error?.message || 'Failed', 'error'); return; }
                          showToast(`Account created for ${u.name}`);
                          setNewUsers(prev => [...prev, { email: u.email!, password, name: u.name, role: u.roles[0] || 'student' }]);
                          invalidate(['profiles', 'user_roles', 'teachers', 'students', 'parents']);
                        }}>
                          <i className="fas fa-user-plus mr-1" />Create
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
        if (created) { setNewUsers(prev => [...prev, created]); invalidate(['profiles', 'user_roles', 'teachers', 'students', 'parents']); }
      }} />}

      {importModal && <ImportUsersModal onClose={(imported) => {
        setImportModal(false);
        if (imported) { setNewUsers(prev => [...prev, ...imported]); invalidate(['profiles', 'user_roles', 'teachers', 'students', 'parents']); }
      }} />}

      {bulkModal && <BulkCreateModal users={usersWithoutAccounts} onClose={(created) => {
        setBulkModal(false);
        if (created) { setNewUsers(prev => [...prev, ...created]); invalidate(['profiles', 'user_roles', 'teachers', 'students', 'parents']); }
      }} />}

      {resetModal && <ResetPasswordModal profile={resetModal} onClose={() => { setResetModal(null); invalidate(['profiles']); }} />}
    </div>
  );
}

/* ── Bulk Create Accounts Modal ── */
function BulkCreateModal({ users, onClose }: { users: UnifiedUser[]; onClose: (created?: { email: string; password: string; name: string; role: string }[]) => void }) {
  const { showToast } = useApp();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [results, setResults] = useState<any[] | null>(null);

  const run = async () => {
    setProcessing(true);
    const total = users.length;
    setProgress({ done: 0, total, failed: 0 });

    const batchSize = 10;
    const allResults: any[] = [];

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize).map(u => ({
        email: u.email, full_name: u.name, role: u.roles[0] || 'student',
        link_table: u.linkTable, link_id: u.linkId,
      }));

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { action: 'bulk_create', users: batch },
      });

      if (error) {
        batch.forEach(b => allResults.push({ ...b, success: false, error: error.message }));
      } else if (data?.results) {
        allResults.push(...data.results);
      }

      const successCount = allResults.filter(r => r.success).length;
      const failedCount = allResults.filter(r => !r.success).length;
      setProgress({ done: successCount + failedCount, total, failed: failedCount });
    }

    setResults(allResults);
    setProcessing(false);
    const created = allResults.filter(r => r.success);
    showToast(`${created.length}/${total} accounts created${progress.failed > 0 ? `, ${progress.failed} failed` : ''}`);
  };

  return (
    <Modal onClose={() => onClose()} size="lg">
      <ModalHead title="Bulk Create Accounts" onClose={() => onClose()} />
      <ModalBody>
        {!results ? (
          <>
            <div className="text-xs mb-3" style={{ color: 'hsl(var(--text2))' }}>
              Create accounts for <strong>{users.length}</strong> people who don't have system accounts yet.
              Each will get a generated password (firstname + 4 digits).
            </div>
            <div className="rounded-md px-3 py-2 text-[11px] mb-3" style={{ background: '#fff8c5', border: '1px solid #ffe07c', color: '#9a6700' }}>
              ⚠ Only users with email addresses will get accounts. Users without emails will be skipped.
            </div>
            <div className="max-h-[200px] overflow-y-auto rounded border text-[11px]" style={{ borderColor: 'hsl(var(--border))' }}>
              {users.map((u, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <span className="font-semibold">{u.name}</span>
                  <span style={{ color: 'hsl(var(--text2))' }}>{u.email || <span style={{ color: '#cf222e' }}>No email</span>} · {u.roles[0]}</span>
                </div>
              ))}
            </div>
            {processing && (
              <div className="mt-3">
                <div className="text-[11px] mb-1" style={{ color: 'hsl(var(--text2))' }}>
                  Processing {progress.done}/{progress.total}...
                </div>
                <div className="w-full rounded-full h-2" style={{ background: 'hsl(var(--surface2))' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%`, background: 'hsl(var(--primary))' }} />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-xs mb-2" style={{ color: 'hsl(var(--text2))' }}>
              ✅ {results.filter(r => r.success).length} created · ❌ {results.filter(r => !r.success).length} failed
            </div>
            <div className="max-h-[300px] overflow-y-auto rounded border text-[11px]" style={{ borderColor: 'hsl(var(--border))' }}>
              {results.map((r, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))', background: r.success ? undefined : '#ffebe9' }}>
                  <span className="font-semibold">{r.name}</span>
                  <span>{r.success ? <span style={{ color: '#1a7f37' }}>✓ {r.email}</span> : <span style={{ color: '#cf222e' }}>✕ {r.error}</span>}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </ModalBody>
      <ModalFoot>
        {!results ? (
          <>
            <Btn variant="outline" onClick={() => onClose()}>Cancel</Btn>
            <Btn onClick={run} disabled={processing}>{processing ? 'Creating…' : `Create ${users.length} Accounts`}</Btn>
          </>
        ) : (
          <>
            <Btn variant="outline" onClick={() => {
              const created = results.filter(r => r.success);
              if (created.length > 0) {
                downloadCSV(created.map(r => ({ Name: r.name, Email: r.email, Password: r.password, Role: r.role })), 'bulk_credentials');
              }
            }}><i className="fas fa-download mr-1" />Download Credentials</Btn>
            <Btn onClick={() => onClose(results.filter(r => r.success).map(r => ({ email: r.email, password: r.password, name: r.name, role: r.role })))}>Done</Btn>
          </>
        )}
      </ModalFoot>
    </Modal>
  );
}

/* ── Import Users Modal ── */
function ImportUsersModal({ onClose }: { onClose: (imported?: { email: string; password: string; name: string; role: string }[]) => void }) {
  const { showToast } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<any[] | null>(null);

  const handleUpload = async () => {
    const file = await triggerFileUpload();
    if (!file) return;
    try {
      const data = await parseExcel(file);
      // Normalize column names
      const normalized = data.map(row => {
        const r: any = {};
        Object.keys(row).forEach(k => {
          const lower = k.toLowerCase().trim();
          if (lower === 'name' || lower === 'full name' || lower === 'full_name' || lower === 'fullname') r.name = row[k];
          else if (lower === 'email' || lower === 'e-mail') r.email = row[k];
          else if (lower === 'role' || lower === 'type') r.role = row[k]?.toLowerCase();
        });
        return r;
      }).filter(r => r.name && r.email);
      
      if (normalized.length === 0) {
        showToast('No valid rows found. Ensure columns: Name, Email, Role', 'error');
        return;
      }
      setRows(normalized);
    } catch (err: any) {
      showToast('Failed to parse file: ' + err.message, 'error');
    }
  };

  const run = async () => {
    setProcessing(true);
    const total = rows.length;
    setProgress({ done: 0, total });

    const batch = rows.map(r => ({
      email: r.email, full_name: r.name, role: r.role || 'teacher',
    }));

    const batchSize = 10;
    const allResults: any[] = [];

    for (let i = 0; i < batch.length; i += batchSize) {
      const chunk = batch.slice(i, i + batchSize);
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { action: 'bulk_create', users: chunk },
      });
      if (error) {
        chunk.forEach(c => allResults.push({ ...c, name: c.full_name, success: false, error: error.message }));
      } else if (data?.results) {
        allResults.push(...data.results);
      }
      setProgress({ done: Math.min(i + batchSize, total), total });
    }

    setResults(allResults);
    setProcessing(false);
    const created = allResults.filter(r => r.success);
    showToast(`${created.length}/${total} users imported`);
  };

  const downloadTemplate = () => {
    downloadExcel([
      { Name: 'John Doe', Email: 'john@school.com', Role: 'teacher' },
      { Name: 'Jane Smith', Email: 'jane@school.com', Role: 'student' },
    ], 'user_import_template', 'Template');
  };

  return (
    <Modal onClose={() => onClose()} size="lg">
      <ModalHead title="Import Users" onClose={() => onClose()} />
      <ModalBody>
        {!results ? (
          <>
            <div className="text-xs mb-3" style={{ color: 'hsl(var(--text2))' }}>
              Upload an Excel/CSV file with columns: <strong>Name</strong>, <strong>Email</strong>, <strong>Role</strong> (teacher/student/parent/admin).
            </div>
            <div className="flex gap-2 mb-3">
              <Btn variant="outline" onClick={downloadTemplate}><i className="fas fa-file-download mr-1" />Download Template</Btn>
              <Btn onClick={handleUpload}><i className="fas fa-upload mr-1" />Upload File</Btn>
            </div>
            {rows.length > 0 && (
              <>
                <div className="text-xs mb-2 font-semibold">{rows.length} users ready to import:</div>
                <div className="max-h-[200px] overflow-y-auto rounded border text-[11px]" style={{ borderColor: 'hsl(var(--border))' }}>
                  <table className="w-full">
                    <thead><tr style={{ background: 'hsl(var(--surface2))' }}>
                      <th className="px-3 py-1.5 text-left">Name</th>
                      <th className="px-3 py-1.5 text-left">Email</th>
                      <th className="px-3 py-1.5 text-left">Role</th>
                    </tr></thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          <td className="px-3 py-1.5">{r.name}</td>
                          <td className="px-3 py-1.5">{r.email}</td>
                          <td className="px-3 py-1.5">{r.role || 'teacher'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {processing && (
              <div className="mt-3">
                <div className="text-[11px] mb-1" style={{ color: 'hsl(var(--text2))' }}>Processing {progress.done}/{progress.total}...</div>
                <div className="w-full rounded-full h-2" style={{ background: 'hsl(var(--surface2))' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%`, background: 'hsl(var(--primary))' }} />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-xs mb-2" style={{ color: 'hsl(var(--text2))' }}>
              ✅ {results.filter(r => r.success).length} imported · ❌ {results.filter(r => !r.success).length} failed
            </div>
            <div className="max-h-[300px] overflow-y-auto rounded border text-[11px]" style={{ borderColor: 'hsl(var(--border))' }}>
              {results.map((r, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))', background: r.success ? undefined : '#ffebe9' }}>
                  <span className="font-semibold">{r.name}</span>
                  <span>{r.success ? <span style={{ color: '#1a7f37' }}>✓</span> : <span style={{ color: '#cf222e' }}>✕ {r.error}</span>}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </ModalBody>
      <ModalFoot>
        {!results ? (
          <>
            <Btn variant="outline" onClick={() => onClose()}>Cancel</Btn>
            {rows.length > 0 && <Btn onClick={run} disabled={processing}>{processing ? 'Importing…' : `Import ${rows.length} Users`}</Btn>}
          </>
        ) : (
          <>
            <Btn variant="outline" onClick={() => {
              const created = results.filter(r => r.success);
              if (created.length > 0) downloadCSV(created.map(r => ({ Name: r.name, Email: r.email, Password: r.password, Role: r.role })), 'imported_credentials');
            }}><i className="fas fa-download mr-1" />Download Credentials</Btn>
            <Btn onClick={() => onClose(results.filter(r => r.success).map(r => ({ email: r.email, password: r.password, name: r.name, role: r.role })))}>Done</Btn>
          </>
        )}
      </ModalFoot>
    </Modal>
  );
}

/* ── Reset Password Modal ── */
function ResetPasswordModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const { showToast } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const pw = newPassword || ((profile.full_name?.split(' ')[0]?.toLowerCase() || 'user') + Math.floor(1000 + Math.random() * 9000));
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { action: 'reset_password', user_id: profile.user_id, new_password: pw },
    });
    if (error || data?.error) { showToast(data?.error || error?.message || 'Failed', 'error'); setSaving(false); return; }
    showToast(`Password reset for ${profile.full_name}. New password: ${pw}`);
    onClose();
  };

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHead title="Reset Password" onClose={onClose} />
      <ModalBody>
        <div className="text-xs mb-3" style={{ color: 'hsl(var(--text2))' }}>Reset password for <strong>{profile.full_name}</strong> ({profile.email})</div>
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

/* ── Create Single User Modal ── */
function CreateUserModal({ onClose }: { onClose: (created?: { email: string; password: string; name: string; role: string }) => void }) {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('teacher');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    const password = (name.split(' ')[0]?.toLowerCase() || 'user') + Math.floor(1000 + Math.random() * 9000);
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email, password, full_name: name, role },
    });
    if (error || data?.error) { showToast(data?.error || error?.message || 'Failed to create user', 'error'); setSaving(false); return; }
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
