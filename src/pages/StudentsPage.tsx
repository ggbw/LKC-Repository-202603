import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useStudents, useInvalidate } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { FORMS, cap, formatDate } from '@/data/database';
import { downloadExcel, parseExcel, triggerFileUpload } from '@/lib/excel';
import { Badge, Card, InfoRow, SearchBar, FilterSelect, Btn, BackBtn,
  Modal, ModalHead, ModalBody, ModalFoot, FormSection, Field, FieldInput, FieldSelect } from '@/components/SharedUI';

export default function StudentsPage() {
  const { detail, setDetail, showToast } = useApp();
  const { isAdmin } = useAuth();
  const { data: students = [], isLoading } = useStudents();
  const [search, setSearch] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterState, setFilterState] = useState('');
  const [modal, setModal] = useState<string | 'new' | null>(null);
  const invalidate = useInvalidate();

  if (detail) return <StudentDetail id={detail} onBack={() => setDetail(null)} />;

  const rows = students.filter((s: any) =>
    (!search || s.full_name.toLowerCase().includes(search.toLowerCase()) || (s.enrollment_number || '').toLowerCase().includes(search.toLowerCase())) &&
    (!filterForm || s.form === filterForm) &&
    (!filterClass || s.class_name === filterClass) &&
    (!filterState || s.state === filterState)
  );

  const handleExport = () => {
    downloadExcel(rows.map((s: any) => ({
      'Enrollment': s.enrollment_number || '', 'Full Name': s.full_name, 'Form': s.form,
      'Class': s.class_name || '', 'Gender': cap(s.gender || ''), 'Status': cap(s.state || 'active'),
      'Date of Birth': s.date_of_birth || '', 'Nationality': s.nationality || '',
      'Email': s.email || '', 'Admission Date': s.admission_date || '',
    })), 'students_export', 'Students');
    showToast('Students exported');
  };

  const handleImport = async () => {
    const file = await triggerFileUpload();
    if (!file) return;
    try {
      const data = await parseExcel(file);
      let count = 0;
      for (const row of data) {
        const name = row['Full Name'] || row['full_name'] || row['Name'] || row['name'];
        const form = row['Form'] || row['form'] || 'Form 1';
        if (!name) continue;
        const { error } = await supabase.from('students').insert({
          full_name: name, form,
          gender: row['Gender'] || row['gender'] || null,
          enrollment_number: row['Enrollment'] || row['enrollment_number'] || null,
          email: row['Email'] || row['email'] || null,
          nationality: row['Nationality'] || row['nationality'] || null,
          date_of_birth: row['Date of Birth'] || row['date_of_birth'] || null,
          state: 'active',
        });
        if (!error) count++;
      }
      showToast(`Imported ${count} students`);
      invalidate(['students']);
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading students...</div></div>;

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold">Students</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{students.length} total</div></div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}>⬇ Export</Btn>
          {isAdmin && <Btn variant="outline" onClick={handleImport}>⬆ Import</Btn>}
          {isAdmin && <Btn onClick={() => setModal('new')}>＋ New Student</Btn>}
        </div>
      </div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search name or enrollment...">
          <FilterSelect value={filterForm} onChange={setFilterForm} allLabel="All Forms" options={FORMS.map(f => ({ value: f, label: f }))} />
          <FilterSelect value={filterClass} onChange={setFilterClass} allLabel="All Classes" options={[...new Set(students.map((s: any) => s.class_name).filter(Boolean))].sort().map(c => ({ value: c, label: c }))} />
          <FilterSelect value={filterState} onChange={setFilterState} allLabel="All Status" options={['active','suspended','graduated','transferred','inactive'].map(s => ({ value: s, label: cap(s) }))} />
        </SearchBar>
        {rows.length === 0 ? <div className="py-10 text-center text-xs" style={{ color: 'hsl(var(--text3))' }}>No students found</div> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                {['Enrollment','Name','Form','Class','Gender','Status', ...(isAdmin ? ['Actions'] : [])].map(h => (
                  <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.slice(0, 100).map((s: any) => (
                  <tr key={s.id} className="hover:bg-[hsl(var(--surface2))] transition-colors" style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{s.enrollment_number || '—'}</td>
                    <td className="py-2.5 px-3.5 font-semibold cursor-pointer" style={{ color: '#1f6feb' }} onClick={() => setDetail(s.id)}>{s.full_name}</td>
                    <td className="py-2.5 px-3.5">{s.form}</td>
                    <td className="py-2.5 px-3.5 text-[11px] font-mono">{s.class_name || '—'}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{cap(s.gender || '')}</td>
                    <td className="py-2.5 px-3.5"><Badge status={s.state || 'active'} /></td>
                    {isAdmin && (
                      <td className="py-2.5 px-3.5">
                        <div className="flex gap-1">
                          <Btn variant="outline" size="sm" onClick={(e: any) => { e.stopPropagation(); setModal(s.id); }}>✏️</Btn>
                          <Btn variant="danger" size="sm" onClick={async (e: any) => {
                            e.stopPropagation();
                            if (!confirm('Delete this student?')) return;
                            await supabase.from('students').delete().eq('id', s.id);
                            invalidate(['students']);
                            showToast('Student deleted');
                          }}>🗑</Btn>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[11px] mt-2.5" style={{ color: 'hsl(var(--text2))' }}>{Math.min(rows.length, 100)} of {rows.length} students</div>
          </div>
        )}
      </Card>
      {modal !== null && <StudentModal id={modal === 'new' ? null : modal} students={students} onClose={() => { setModal(null); invalidate(['students']); }} />}
    </div>
  );
}

function StudentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: students = [] } = useStudents();
  const s = students.find((x: any) => x.id === id) as any;
  if (!s) return <><BackBtn onClick={onBack} label="Back" /><div>Not found</div></>;

  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Students" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center text-[32px] flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>{s.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}</div>
        <div>
          <div className="text-xl font-bold">{s.full_name}</div>
          <div className="flex gap-2 items-center flex-wrap mt-1.5">
            <Badge status={s.state || 'active'} />
            <span className="text-[11px] font-mono" style={{ color: 'hsl(var(--text2))' }}>{s.enrollment_number}</span>
            <span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{s.form}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title="Personal Information">
          {[['Date of Birth', formatDate(s.date_of_birth)], ['Gender', cap(s.gender || '')], ['Form', s.form], ['Class', s.class_name || '—'], ['Enrollment', s.enrollment_number || '—'], ['Email', s.email || '—'], ['Nationality', s.nationality || '—'], ['Admission Date', formatDate(s.admission_date)]].map(([k, v]) => (
            <InfoRow key={k} label={k} value={v} />
          ))}
        </Card>
        <Card title="Academic Info">
          <InfoRow label="Academic Year" value={s.academic_year || '2026'} />
          <InfoRow label="State" value={cap(s.state || 'active')} />
        </Card>
      </div>
    </div>
  );
}

function StudentModal({ id, students, onClose }: { id: string | null; students: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const existing = id ? students.find((s: any) => s.id === id) : null;
  const [name, setName] = useState(existing?.full_name || '');
  const [form, setForm] = useState(existing?.form || 'Form 1');
  const [gender, setGender] = useState(existing?.gender || 'male');
  const [enrollment, setEnrollment] = useState(existing?.enrollment_number || '');
  const [className, setClassName] = useState(existing?.class_name || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [state, setState] = useState(existing?.state || 'active');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (id) {
      const { error } = await supabase.from('students').update({ full_name: name, form, gender, enrollment_number: enrollment || null, class_name: className || null, email: email || null, state }).eq('id', id);
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      showToast('Student updated');
    } else {
      const { error } = await supabase.from('students').insert({ full_name: name, form, gender, enrollment_number: enrollment || null, class_name: className || null, email: email || null, state: 'active' });
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      showToast(`Student "${name}" created`);
    }
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={id ? '✏️ Edit Student' : '➕ Add Student'} onClose={onClose} />
      <ModalBody>
        <FormSection title="Basic Information" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name" required><FieldInput value={name} onChange={setName} /></Field>
          <Field label="Form" required><FieldSelect value={form} onChange={setForm} options={FORMS.map(f => ({ value: f, label: f }))} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Gender"><FieldSelect value={gender} onChange={setGender} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} /></Field>
          <Field label="Enrollment #"><FieldInput value={enrollment} onChange={setEnrollment} /></Field>
          <Field label="Class"><FieldInput value={className} onChange={setClassName} placeholder="e.g. B, M, K" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><FieldInput value={email} onChange={setEmail} type="email" /></Field>
          {id && <Field label="Status"><FieldSelect value={state} onChange={setState} options={['active','suspended','graduated','transferred','inactive'].map(s => ({ value: s, label: cap(s) }))} /></Field>}
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : id ? 'Update' : 'Create'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
