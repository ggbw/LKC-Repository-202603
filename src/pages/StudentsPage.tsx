import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DB, FORMS, DIVS, STATES_STU, BLOOD_GROUPS, TEACHERS, cap, G, P } from '@/data/database';
import { Badge, Card, InfoRow, SearchBar, FilterSelect, Btn, BackBtn, GradeChip,
  Modal, ModalHead, ModalBody, ModalFoot, FormSection, Field, FieldInput, FieldSelect, DeleteModal } from '@/components/SharedUI';

export default function StudentsPage() {
  const { detail, setDetail, showToast, refresh, tick } = useApp();
  const [search, setSearch] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const [filterState, setFilterState] = useState('');
  const [modal, setModal] = useState<number | 'new' | null>(null);
  const [delModal, setDelModal] = useState<{ id: number; name: string } | null>(null);

  if (detail) return <StudentDetail id={detail} onBack={() => setDetail(null)} onEdit={(id) => setModal(id)} />;

  const rows = DB.students.filter(s =>
    (!search || s.student_full_name.toLowerCase().includes(search.toLowerCase()) || s.enrollment_number.toLowerCase().includes(search.toLowerCase())) &&
    (!filterForm || s.form === filterForm) &&
    (!filterState || s.state === filterState)
  );

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold">Students</div>
          <div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>POST /api/students/ · {DB.students.length} total</div>
        </div>
        <Btn onClick={() => setModal('new')}>＋ New Student</Btn>
      </div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search name or enrollment...">
          <FilterSelect value={filterForm} onChange={setFilterForm} allLabel="All Forms" options={FORMS.map(f => ({ value: f, label: f }))} />
          <FilterSelect value={filterState} onChange={setFilterState} allLabel="All Status" options={STATES_STU.map(s => ({ value: s, label: cap(s) }))} />
        </SearchBar>
        {rows.length === 0 ? (
          <div className="py-10 text-center text-xs" style={{ color: 'hsl(var(--text3))' }}>No students found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                  <th className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'hsl(var(--text2))' }}>Enrollment</th>
                  <th className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>Name</th>
                  <th className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>Form</th>
                  <th className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>Div</th>
                  <th className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>Gender</th>
                  <th className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>Status</th>
                  <th className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>Parent</th>
                  <th className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 60).map(s => (
                  <tr key={s.id} className="hover:bg-[hsl(var(--surface2))] transition-colors" style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{s.enrollment_number}</td>
                    <td className="py-2.5 px-3.5 font-semibold cursor-pointer" style={{ color: '#1f6feb' }} onClick={() => setDetail(s.id)}>{s.student_full_name}</td>
                    <td className="py-2.5 px-3.5">{s.form}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]">{s.division}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{s.gender === 'male' ? 'Male' : 'Female'}</td>
                    <td className="py-2.5 px-3.5"><Badge status={s.state} /></td>
                    <td className="py-2.5 px-3.5 text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{s.parent_name || '—'}</td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <Btn variant="outline" size="sm" onClick={() => setModal(s.id)}>✏️</Btn>
                      <Btn variant="outline" size="sm" onClick={() => setDelModal({ id: s.id, name: s.student_full_name })}
                        className="ml-1" style={{ background: '#ffebe9', color: '#cf222e', borderColor: '#ffc1ba' }}>🗑</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[11px] mt-2.5" style={{ color: 'hsl(var(--text2))' }}>{Math.min(rows.length, 60)} of {rows.length} students</div>
          </div>
        )}
      </Card>

      {modal !== null && <StudentModal id={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
      {delModal && <DeleteModal title="Delete Student?" message={`"${delModal.name}" will be removed.`} api={`DELETE /api/students/${delModal.id}/`}
        onClose={() => setDelModal(null)} onConfirm={() => {
          const i = DB.students.findIndex(s => s.id === delModal.id);
          if (i > -1) DB.students.splice(i, 1);
          setDelModal(null); showToast(`"${delModal.name}" deleted`, 'info'); setDetail(null); refresh();
        }} />}
    </div>
  );
}

function StudentDetail({ id, onBack, onEdit }: { id: number; onBack: () => void; onEdit: (id: number) => void }) {
  const s = DB.students.find(x => x.id === id);
  if (!s) return <><BackBtn onClick={onBack} label="Back" /><div>Not found</div></>;
  const par = DB.parents.find(p => p.id === s.parent_id);
  const sRes = DB.results.filter(r => r.sid === s.id);
  const sAtt = DB.attendance.filter(a => a.student === s.student_full_name).slice(0, 5);

  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Students" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center text-[32px] flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>{s.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}</div>
        <div>
          <div className="text-xl font-bold">{s.student_full_name}</div>
          <div className="flex gap-2 items-center flex-wrap mt-1.5">
            <Badge status={s.state} />
            <span className="text-[11px] font-mono" style={{ color: 'hsl(var(--text2))' }}>{s.enrollment_number}</span>
            <span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{s.form} · {s.division}</span>
          </div>
          <div className="mt-2"><Btn variant="primary" size="sm" onClick={() => onEdit(s.id)}>✏️ Edit</Btn></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title="Personal Information">
          {[['Date of Birth', s.date_of_birth || '—'], ['Gender', cap(s.gender)], ['Form', s.form], ['Division', s.division], ['Enrollment', s.enrollment_number], ['Mobile', s.mobile || '—'], ['Email', s.email || '—'], ['Parent', par ? par.parent_name : '—']].map(([k, v]) => (
            <InfoRow key={k} label={k} value={v} />
          ))}
        </Card>
        <div>
          <Card title="📋 Exam Results" className="mb-3.5">
            {sRes.length ? sRes.map((r, i) => {
              const p = P(r.obtained, r.max);
              return (
                <div key={i} className="flex justify-between items-center py-[7px] text-xs" style={{ borderBottom: '1px solid #f6f8fa' }}>
                  <div className="font-semibold">{r.subject}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{p}%</span>
                    <GradeChip grade={G(p)} />
                  </div>
                </div>
              );
            }) : <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No results yet</div>}
          </Card>
          <Card title="✅ Attendance">
            {sAtt.length ? sAtt.map((a, i) => (
              <div key={i} className="flex justify-between py-1.5 text-xs" style={{ borderBottom: '1px solid #f6f8fa' }}>
                <span className="font-mono" style={{ color: 'hsl(var(--text2))' }}>{a.date}</span>
                <Badge status={a.state} />
              </div>
            )) : <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No records</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StudentModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { showToast, refresh } = useApp();
  const existing = id ? DB.students.find(s => s.id === id) : null;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.student_full_name || '');
  const [eno, setEno] = useState(existing?.enrollment_number || `STU${String(DB._eno).padStart(4, '0')}`);
  const [gender, setGender] = useState(existing?.gender || 'male');
  const [dob, setDob] = useState(existing?.date_of_birth || '');
  const [blood, setBlood] = useState(existing?.blood_group || '');
  const [form, setForm] = useState(existing?.form || '');
  const [div, setDiv] = useState(existing?.div_letter || '');
  const [state, setState] = useState(existing?.state || 'active');
  const [parentId, setParentId] = useState(String(existing?.parent_id || ''));
  const [mobile, setMobile] = useState(existing?.mobile || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const divOptions = form ? (DIVS[form] || []).map(d => ({ value: d, label: d })) : [];

  const save = () => {
    const errs: Record<string, string> = {};
    if (!name) errs.name = 'Required.';
    if (!eno) errs.eno = 'Required.';
    if (eno && DB.students.some(s => s.enrollment_number === eno && s.id !== id)) errs.eno = 'Already exists.';
    if (!form) errs.form = 'Required.';
    if (!div) errs.div = 'Required.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const pid = parseInt(parentId) || null;
    const par = DB.parents.find(p => p.id === pid);
    const data = {
      student_full_name: name, enrollment_number: eno, gender, date_of_birth: dob || '',
      blood_group: blood, form, div_letter: div,
      division: `${form.replace('Form ', '')}${div}`, state,
      parent_id: pid, parent_name: par?.parent_name || null,
      mobile, email, city: 'Gaborone', medical_notes: '', notes: '',
    };

    setTimeout(() => {
      if (id && existing) { Object.assign(existing, data); }
      else { DB.students.push({ id: DB._sid++, ...data } as any); DB._eno++; }
      showToast(`Student "${name}" ${id ? 'updated' : 'created'}`);
      onClose(); refresh();
    }, 400);
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={isEdit ? '✏️ Edit Student' : '➕ Add Student'} onClose={onClose} />
      <ModalBody>
        <FormSection title="Basic Information" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name" required error={errors.name}><FieldInput value={name} onChange={setName} hasError={!!errors.name} /></Field>
          <Field label="Enrollment No." required error={errors.eno}><FieldInput value={eno} onChange={setEno} readOnly={isEdit} hasError={!!errors.eno} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Gender"><FieldSelect value={gender} onChange={setGender} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} /></Field>
          <Field label="Date of Birth"><FieldInput value={dob} onChange={setDob} type="date" /></Field>
          <Field label="Blood Group"><FieldSelect value={blood} onChange={setBlood} options={[{ value: '', label: '—' }, ...BLOOD_GROUPS.map(b => ({ value: b, label: b }))]} /></Field>
        </div>
        <FormSection title="Academic" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Form" required error={errors.form}>
            <FieldSelect value={form} onChange={v => { setForm(v); setDiv(''); }} hasError={!!errors.form}
              options={[{ value: '', label: '— Select —' }, ...FORMS.map(f => ({ value: f, label: f }))]} />
          </Field>
          <Field label="Division" required error={errors.div}>
            <FieldSelect value={div} onChange={setDiv} hasError={!!errors.div}
              options={[{ value: '', label: '— Select —' }, ...divOptions]} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status"><FieldSelect value={state} onChange={setState} options={STATES_STU.map(s => ({ value: s, label: cap(s) }))} /></Field>
          <Field label="Parent">
            <FieldSelect value={parentId} onChange={setParentId}
              options={[{ value: '', label: '— None —' }, ...DB.parents.map(p => ({ value: String(p.id), label: p.parent_name }))]} />
          </Field>
        </div>
        <FormSection title="Contact" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile"><FieldInput value={mobile} onChange={setMobile} /></Field>
          <Field label="Email"><FieldInput value={email} onChange={setEmail} type="email" /></Field>
        </div>
      </ModalBody>
      <ModalFoot api={isEdit ? `PATCH /api/students/${id}/` : 'POST /api/students/'}>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
