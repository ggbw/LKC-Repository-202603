import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useTeachers, useSubjectTeachers, useInvalidate } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { cap } from '@/data/database';
import { downloadExcel, parseExcel, triggerFileUpload } from '@/lib/excel';
import { Badge, Card, InfoRow, SearchBar, BackBtn, Btn,
  Modal, ModalHead, ModalBody, ModalFoot, Field, FieldInput, FieldSelect } from '@/components/SharedUI';

export default function FacultyPage() {
  const { detail, setDetail, showToast } = useApp();
  const { isAdmin } = useAuth();
  const { data: teachers = [], isLoading } = useTeachers();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const invalidate = useInvalidate();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<string | 'new' | null>(null);

  if (detail) {
    const t = teachers.find((x: any) => x.id === detail) as any;
    if (t) {
      const subjects = subjectTeachers.filter((st: any) => st.teacher_id === t.id).map((st: any) => st.subjects?.name).filter(Boolean);
      return (
        <div className="page-animate">
          <BackBtn onClick={() => setDetail(null)} label="Back to Teachers" />
          <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center text-[32px] flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>👩‍🏫</div>
            <div>
              <div className="text-xl font-bold">{t.name}</div>
              <div className="flex gap-2 items-center mt-1.5"><Badge status={t.state || 'active'} /><span className="font-mono text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{t.code}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card title="Details">
              {[['Email', t.email || '—'], ['Phone', t.phone || '—'], ['Department', t.department || '—'], ['Code', t.code || '—'], ['Joining Date', t.joining_date || '—']].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}
            </Card>
            <Card title={`Subjects (${subjects.length})`}>
              {subjects.length ? subjects.map((s: string) => (
                <div key={s} className="py-1.5 text-xs" style={{ borderBottom: '1px solid #f6f8fa' }}>{s}</div>
              )) : <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No subjects assigned</div>}
            </Card>
          </div>
        </div>
      );
    }
  }

  const filt = teachers.filter((t: any) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.code || '').toLowerCase().includes(search.toLowerCase()));

  const handleExport = () => {
    downloadExcel(filt.map((t: any) => ({
      'Code': t.code || '', 'Name': t.name, 'Department': t.department || '',
      'Email': t.email || '', 'Phone': t.phone || '', 'Status': cap(t.state || 'active'),
    })), 'teachers_export', 'Teachers');
    showToast('Teachers exported');
  };

  const handleImport = async () => {
    const file = await triggerFileUpload();
    if (!file) return;
    try {
      const data = await parseExcel(file);
      let count = 0;
      for (const row of data) {
        const name = row['Name'] || row['name'];
        if (!name) continue;
        const { error } = await supabase.from('teachers').insert({
          name, code: row['Code'] || row['code'] || null,
          department: row['Department'] || row['department'] || null,
          email: row['Email'] || row['email'] || null,
          phone: row['Phone'] || row['phone'] || null,
        });
        if (!error) count++;
      }
      showToast(`Imported ${count} teachers`);
      invalidate(['teachers']);
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold">Teachers</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{teachers.length} total</div></div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}>⬇ Export</Btn>
          {isAdmin && <Btn variant="outline" onClick={handleImport}>⬆ Import</Btn>}
          {isAdmin && <Btn onClick={() => setModal('new')}>＋ New Teacher</Btn>}
        </div>
      </div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search..." />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Code','Name','Department','Email','Status', ...(isAdmin ? ['Actions'] : [])].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filt.map((t: any) => (
                <tr key={t.id} className="hover:bg-[hsl(var(--surface2))] cursor-pointer" style={{ borderBottom: '1px solid #f6f8fa' }} onClick={() => setDetail(t.id)}>
                  <td className="py-2.5 px-3.5 font-mono text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{t.code}</td>
                  <td className="py-2.5 px-3.5 font-semibold">{t.name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{t.department}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{t.email || '—'}</td>
                  <td className="py-2.5 px-3.5"><Badge status={t.state || 'active'} /></td>
                  {isAdmin && (
                    <td className="py-2.5 px-3.5">
                      <div className="flex gap-1">
                        <Btn variant="outline" size="sm" onClick={(e: any) => { e.stopPropagation(); setModal(t.id); }}>✏️</Btn>
                        <Btn variant="danger" size="sm" onClick={async (e: any) => {
                          e.stopPropagation();
                          if (!confirm('Delete this teacher?')) return;
                          await supabase.from('teachers').delete().eq('id', t.id);
                          invalidate(['teachers']);
                          showToast('Teacher deleted');
                        }}>🗑</Btn>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {modal !== null && <TeacherModal id={modal === 'new' ? null : modal} teachers={teachers} onClose={() => { setModal(null); invalidate(['teachers']); }} />}
    </div>
  );
}

function TeacherModal({ id, teachers, onClose }: { id: string | null; teachers: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const existing = id ? teachers.find((t: any) => t.id === id) : null;
  const [name, setName] = useState(existing?.name || '');
  const [code, setCode] = useState(existing?.code || '');
  const [dept, setDept] = useState(existing?.department || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (id) {
      const { error } = await supabase.from('teachers').update({ name, code: code || null, department: dept || null, email: email || null, phone: phone || null }).eq('id', id);
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      showToast('Teacher updated');
    } else {
      const { error } = await supabase.from('teachers').insert({ name, code: code || null, department: dept || null, email: email || null, phone: phone || null });
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      showToast(`Teacher "${name}" created`);
    }
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={id ? '✏️ Edit Teacher' : '➕ Add Teacher'} onClose={onClose} />
      <ModalBody>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required><FieldInput value={name} onChange={setName} /></Field>
          <Field label="Code"><FieldInput value={code} onChange={setCode} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department"><FieldInput value={dept} onChange={setDept} /></Field>
          <Field label="Email"><FieldInput value={email} onChange={setEmail} type="email" /></Field>
        </div>
        <Field label="Phone"><FieldInput value={phone} onChange={setPhone} /></Field>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : id ? 'Update' : 'Create'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
