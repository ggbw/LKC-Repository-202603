import React, { useState, useMemo } from 'react';
import { useSubjects, useTeachers, useStudents, useHODAssignments, useHOYAssignments, useSubjectTeachers, useStudentSubjects, useClassTeachers, useInvalidate } from '@/hooks/useSupabaseData';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { FORMS, cap } from '@/data/database';
import { Card, Badge, Btn, FilterSelect, Modal, ModalHead, ModalBody, ModalFoot, Field, FieldSelect, SearchBar } from '@/components/SharedUI';

export default function ConfigPage() {
  const { data: subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  const { data: students = [] } = useStudents();
  const { data: hodAssignments = [] } = useHODAssignments();
  const { data: hoyAssignments = [] } = useHOYAssignments();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: studentSubjects = [] } = useStudentSubjects();
  const { data: classTeachers = [] } = useClassTeachers();
  const { isAdmin } = useAuth();
  const { showToast } = useApp();
  const invalidate = useInvalidate();
  const [hodModal, setHodModal] = useState(false);
  const [hoyModal, setHoyModal] = useState(false);
  const [stModal, setStModal] = useState(false);
  const [ssModal, setSsModal] = useState(false);
  const [ctModal, setCtModal] = useState(false);
  const [tab, setTab] = useState<'general' | 'subject-teacher' | 'subject-student' | 'class-teacher'>('general');

  const tabs = [
    ['general', 'General'],
    ['subject-teacher', `Subject → Teacher (${subjectTeachers.length})`],
    ['subject-student', `Subject → Student (${studentSubjects.length})`],
    ['class-teacher', `Class Teachers (${classTeachers.length})`],
  ];

  return (
    <div className="page-animate">
      <div className="text-lg font-bold mb-4"><i className="fas fa-cogs mr-2" />Configuration</div>

      <div className="flex mb-3" style={{ borderBottom: '2px solid hsl(var(--border))' }}>
        {tabs.map(([id, label]) => (
          <div key={id} onClick={() => setTab(id as any)}
            className="py-2 px-4 text-[12px] font-semibold cursor-pointer"
            style={{
              borderBottom: tab === id ? '2px solid #1a3fa0' : '2px solid transparent',
              color: tab === id ? '#1a3fa0' : 'hsl(var(--text2))', marginBottom: '-2px',
            }}>{label}</div>
        ))}
      </div>

      {tab === 'general' && <GeneralTab subjects={subjects} teachers={teachers} hodAssignments={hodAssignments} hoyAssignments={hoyAssignments}
        isAdmin={isAdmin} setHodModal={setHodModal} setHoyModal={setHoyModal} />}

      {tab === 'subject-teacher' && <SubjectTeacherTab subjectTeachers={subjectTeachers} subjects={subjects} teachers={teachers}
        isAdmin={isAdmin} showToast={showToast} invalidate={invalidate} onAdd={() => setStModal(true)} />}

      {tab === 'subject-student' && <SubjectStudentTab studentSubjects={studentSubjects} subjects={subjects} students={students}
        isAdmin={isAdmin} showToast={showToast} invalidate={invalidate} onAdd={() => setSsModal(true)} />}

      {tab === 'class-teacher' && <ClassTeacherTab classTeachers={classTeachers} teachers={teachers} students={students}
        isAdmin={isAdmin} showToast={showToast} invalidate={invalidate} onAdd={() => setCtModal(true)} />}

      {hodModal && <RoleModal type="hod" teachers={teachers} onClose={() => { setHodModal(false); invalidate(['hod_assignments']); }} />}
      {hoyModal && <RoleModal type="hoy" teachers={teachers} onClose={() => { setHoyModal(false); invalidate(['hoy_assignments']); }} />}
      {stModal && <SubjectTeacherModal subjects={subjects} teachers={teachers} onClose={() => { setStModal(false); invalidate(['subject_teachers']); }} />}
      {ssModal && <SubjectStudentModal subjects={subjects} students={students} onClose={() => { setSsModal(false); invalidate(['student_subjects']); }} />}
      {ctModal && <ClassTeacherModal teachers={teachers} students={students} onClose={() => { setCtModal(false); invalidate(['class_teachers']); }} />}
    </div>
  );
}

function GeneralTab({ subjects, teachers, hodAssignments, hoyAssignments, isAdmin, setHodModal, setHoyModal }: any) {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      <Card title={<><i className="fas fa-calendar-alt mr-1.5" />Academic Years</>}>
        {[{ y: '2026', s: 'active' }, { y: '2025', s: 'closed' }].map(({ y, s }) => (
          <div key={y} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
            <span style={{ color: 'hsl(var(--text2))' }}>{y}</span><Badge status={s} />
          </div>
        ))}
      </Card>
      <Card title={<><i className="fas fa-book mr-1.5" />Subjects ({subjects.length})</>}>
        <div className="flex flex-wrap gap-1.5">
          {subjects.map((s: any) => (
            <span key={s.id} className="rounded-[5px] px-[9px] py-0.5 text-[11px]" style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>
              {s.name} <span className="font-mono text-[9px]" style={{ color: 'hsl(var(--text3))' }}>{s.code}</span>
            </span>
          ))}
        </div>
      </Card>
      <Card title={<><i className="fas fa-chart-line mr-1.5" />HOD Assignments</>} titleRight={isAdmin && <Btn variant="outline" size="sm" onClick={() => setHodModal(true)}><i className="fas fa-plus mr-1" />Assign</Btn>}>
        {hodAssignments.length === 0 ? <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No HOD assignments</div> : (
          hodAssignments.map((h: any) => (
            <div key={h.id} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <span className="font-semibold">{h.teachers?.name || '—'}</span>
              <span style={{ color: 'hsl(var(--text2))' }}>{h.department}</span>
            </div>
          ))
        )}
      </Card>
      <Card title={<><i className="fas fa-chart-pie mr-1.5" />HOY Assignments</>} titleRight={isAdmin && <Btn variant="outline" size="sm" onClick={() => setHoyModal(true)}><i className="fas fa-plus mr-1" />Assign</Btn>}>
        {hoyAssignments.length === 0 ? <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No HOY assignments</div> : (
          hoyAssignments.map((h: any) => (
            <div key={h.id} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <span className="font-semibold">{h.teachers?.name || '—'}</span>
              <span style={{ color: 'hsl(var(--text2))' }}>{h.form}</span>
            </div>
          ))
        )}
      </Card>
      <Card title={<><i className="fas fa-school mr-1.5" />Forms</>}>
        {FORMS.map(f => (
          <div key={f} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
            <span style={{ color: 'hsl(var(--text2))' }}>{f}</span>
          </div>
        ))}
      </Card>
      <Card title={<><i className="fas fa-user-shield mr-1.5" />User Roles</>}>
        <div className="text-xs" style={{ color: 'hsl(var(--text2))' }}>
          <div className="mb-1">Admin, Teacher, Student, Parent, HOD, HOY</div>
          <div className="text-[10px]" style={{ color: 'hsl(var(--text3))' }}>Assign HOD/HOY roles using the cards above.</div>
        </div>
      </Card>
    </div>
  );
}

function SubjectTeacherTab({ subjectTeachers, subjects, teachers, isAdmin, showToast, invalidate, onAdd }: any) {
  const [filterSubject, setFilterSubject] = useState('');
  const filtered = subjectTeachers.filter((st: any) => !filterSubject || st.subject_id === filterSubject);

  return (
    <Card title="Subject → Teacher Mappings" titleRight={isAdmin && <Btn size="sm" onClick={onAdd}><i className="fas fa-plus mr-1" />Map Subject to Teacher</Btn>}>
      <div className="mb-3">
        <FilterSelect value={filterSubject} onChange={setFilterSubject} allLabel="All Subjects"
          options={subjects.map((s: any) => ({ value: s.id, label: s.name }))} />
      </div>
      {filtered.length === 0 ? <div className="text-xs py-4 text-center" style={{ color: 'hsl(var(--text3))' }}>No mappings</div> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Subject', 'Code', 'Teacher', 'Department', 'Actions'].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((st: any) => (
                <tr key={st.id} style={{ borderBottom: '1px solid #f6f8fa' }}>
                  <td className="py-2.5 px-3.5 font-semibold">{st.subjects?.name}</td>
                  <td className="py-2.5 px-3.5 font-mono text-[11px]">{st.subjects?.code}</td>
                  <td className="py-2.5 px-3.5">{st.teachers?.name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{st.teachers?.department}</td>
                  <td className="py-2.5 px-3.5">
                    {isAdmin && <Btn variant="danger" size="sm" onClick={async () => {
                      await supabase.from('subject_teachers').delete().eq('id', st.id);
                      invalidate(['subject_teachers']);
                      showToast('Removed');
                    }}><i className="fas fa-trash" /></Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function SubjectStudentTab({ studentSubjects, subjects, students, isAdmin, showToast, invalidate, onAdd }: any) {
  const [filterSubject, setFilterSubject] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const filtered = studentSubjects.filter((ss: any) =>
    (!filterSubject || ss.subject_id === filterSubject) &&
    (!filterForm || ss.students?.form === filterForm)
  );

  return (
    <Card title="Subject → Student Mappings" titleRight={isAdmin && <Btn size="sm" onClick={onAdd}><i className="fas fa-plus mr-1" />Map Subject to Students</Btn>}>
      <div className="flex gap-2 mb-3">
        <FilterSelect value={filterSubject} onChange={setFilterSubject} allLabel="All Subjects"
          options={subjects.map((s: any) => ({ value: s.id, label: s.name }))} />
        <FilterSelect value={filterForm} onChange={setFilterForm} allLabel="All Forms"
          options={FORMS.map(f => ({ value: f, label: f }))} />
      </div>
      {filtered.length === 0 ? <div className="text-xs py-4 text-center" style={{ color: 'hsl(var(--text3))' }}>No mappings</div> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Subject', 'Student', 'Form', 'Actions'].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.slice(0, 100).map((ss: any) => (
                <tr key={ss.id} style={{ borderBottom: '1px solid #f6f8fa' }}>
                  <td className="py-2.5 px-3.5 font-semibold">{ss.subjects?.name}</td>
                  <td className="py-2.5 px-3.5">{ss.students?.full_name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{ss.students?.form}</td>
                  <td className="py-2.5 px-3.5">
                    {isAdmin && <Btn variant="danger" size="sm" onClick={async () => {
                      await supabase.from('student_subjects').delete().eq('id', ss.id);
                      invalidate(['student_subjects']);
                      showToast('Removed');
                    }}><i className="fas fa-trash" /></Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[11px] mt-2" style={{ color: 'hsl(var(--text2))' }}>{filtered.length} mappings</div>
        </div>
      )}
    </Card>
  );
}

function ClassTeacherTab({ classTeachers, teachers, students, isAdmin, showToast, invalidate, onAdd }: any) {
  return (
    <Card title="Class Teacher Assignments" titleRight={isAdmin && <Btn size="sm" onClick={onAdd}><i className="fas fa-plus mr-1" />Assign Class Teacher</Btn>}>
      {classTeachers.length === 0 ? <div className="text-xs py-4 text-center" style={{ color: 'hsl(var(--text3))' }}>No class teachers assigned</div> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Form', 'Class', 'Teacher', 'Actions'].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {classTeachers.map((ct: any) => (
                <tr key={ct.id} style={{ borderBottom: '1px solid #f6f8fa' }}>
                  <td className="py-2.5 px-3.5 font-semibold">{ct.form}</td>
                  <td className="py-2.5 px-3.5">{ct.class_name}</td>
                  <td className="py-2.5 px-3.5">{ct.teachers?.name}</td>
                  <td className="py-2.5 px-3.5">
                    {isAdmin && <Btn variant="danger" size="sm" onClick={async () => {
                      await (supabase.from('class_teachers') as any).delete().eq('id', ct.id);
                      invalidate(['class_teachers']);
                      showToast('Removed');
                    }}><i className="fas fa-trash" /></Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// === Modals ===

function RoleModal({ type, teachers, onClose }: { type: 'hod' | 'hoy'; teachers: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const [teacherId, setTeacherId] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const departments = [...new Set(teachers.map((t: any) => t.department).filter(Boolean))].sort();

  const save = async () => {
    if (!teacherId || !value) return;
    setSaving(true);
    if (type === 'hod') {
      const { error } = await supabase.from('hod_assignments').insert({ teacher_id: teacherId, department: value });
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      const teacher = teachers.find((t: any) => t.id === teacherId) as any;
      if (teacher?.user_id) {
        await supabase.from('user_roles').upsert({ user_id: teacher.user_id, role: 'hod' }, { onConflict: 'user_id,role' });
      }
    } else {
      const { error } = await supabase.from('hoy_assignments').insert({ teacher_id: teacherId, form: value });
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      const teacher = teachers.find((t: any) => t.id === teacherId) as any;
      if (teacher?.user_id) {
        await supabase.from('user_roles').upsert({ user_id: teacher.user_id, role: 'hoy' }, { onConflict: 'user_id,role' });
      }
    }
    showToast(`${type.toUpperCase()} assignment created`);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={`Assign ${type.toUpperCase()}`} onClose={onClose} />
      <ModalBody>
        <Field label="Teacher" required>
          <FieldSelect value={teacherId} onChange={setTeacherId}
            options={[{ value: '', label: '— Select —' }, ...teachers.map((t: any) => ({ value: t.id, label: t.name }))]} />
        </Field>
        <Field label={type === 'hod' ? 'Department' : 'Form'} required>
          <FieldSelect value={value} onChange={setValue}
            options={[{ value: '', label: '— Select —' }, ...(type === 'hod' ? departments.map(d => ({ value: d, label: d })) : FORMS.map(f => ({ value: f, label: f })))]} />
        </Field>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Assign'}</Btn>
      </ModalFoot>
    </Modal>
  );
}

function SubjectTeacherModal({ subjects, teachers, onClose }: { subjects: any[]; teachers: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const [subjectId, setSubjectId] = useState('');
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleTeacher = (id: string) => {
    setTeacherIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const save = async () => {
    if (!subjectId || teacherIds.length === 0) return;
    setSaving(true);
    const records = teacherIds.map(tid => ({ subject_id: subjectId, teacher_id: tid }));
    const { error } = await supabase.from('subject_teachers').insert(records);
    if (error) { showToast(error.message, 'error'); setSaving(false); return; }
    showToast(`${records.length} teacher(s) mapped to subject`);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title="Map Subject to Teachers" onClose={onClose} />
      <ModalBody>
        <Field label="Subject" required>
          <FieldSelect value={subjectId} onChange={setSubjectId}
            options={[{ value: '', label: '— Select Subject —' }, ...subjects.map((s: any) => ({ value: s.id, label: `${s.name} (${s.code})` }))]} />
        </Field>
        <Field label="Select Teachers" required>
          <div className="max-h-[250px] overflow-y-auto border rounded-md p-2" style={{ borderColor: 'hsl(var(--border))' }}>
            {teachers.map((t: any) => (
              <label key={t.id} className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-[hsl(var(--surface2))] text-[12px]">
                <input type="checkbox" checked={teacherIds.includes(t.id)} onChange={() => toggleTeacher(t.id)} />
                <span className="font-semibold">{t.name}</span>
                <span className="text-[10px]" style={{ color: 'hsl(var(--text3))' }}>{t.department}</span>
              </label>
            ))}
          </div>
          <div className="text-[10px] mt-1" style={{ color: 'hsl(var(--text3))' }}>{teacherIds.length} selected</div>
        </Field>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Map Teachers'}</Btn>
      </ModalFoot>
    </Modal>
  );
}

function SubjectStudentModal({ subjects, students, onClose }: { subjects: any[]; students: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const { data: subjectTeachersAll = [] } = useSubjectTeachers();
  const { data: existingStudentSubjects = [] } = useStudentSubjects();
  const [subjectId, setSubjectId] = useState('');
  const [filterForm, setFilterForm] = useState('Form 1');
  const [filterClass, setFilterClass] = useState('');
  const [searchStr, setSearchStr] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Teachers who teach the selected subject
  const matchedTeachers = useMemo(() => {
    if (!subjectId) return [];
    return subjectTeachersAll
      .filter((st: any) => st.subject_id === subjectId)
      .map((st: any) => st.teachers)
      .filter(Boolean);
  }, [subjectId, subjectTeachersAll]);

  // Students already mapped to this subject
  const alreadyMappedIds = useMemo(() => {
    if (!subjectId) return new Set<string>();
    return new Set(existingStudentSubjects.filter((ss: any) => ss.subject_id === subjectId).map((ss: any) => ss.student_id));
  }, [subjectId, existingStudentSubjects]);

  // Available classes for current form
  const availableClasses = useMemo(() => {
    return [...new Set(students.filter((s: any) => s.form === filterForm && s.state === 'active').map((s: any) => s.class_name).filter(Boolean))].sort();
  }, [students, filterForm]);

  const formStudents = useMemo(() => {
    return students.filter((s: any) =>
      s.form === filterForm && s.state === 'active' &&
      (!filterClass || s.class_name === filterClass) &&
      (!searchStr || s.full_name.toLowerCase().includes(searchStr.toLowerCase()) || (s.enrollment_number || '').toLowerCase().includes(searchStr.toLowerCase()))
    );
  }, [students, filterForm, filterClass, searchStr]);

  // Split into unmapped and already-mapped
  const unmappedStudents = formStudents.filter(s => !alreadyMappedIds.has(s.id));
  const mappedStudents = formStudents.filter(s => alreadyMappedIds.has(s.id));

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const ids = unmappedStudents.map((s: any) => s.id);
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) return prev.filter(id => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const save = async () => {
    if (!subjectId || selectedIds.length === 0) return;
    setSaving(true);
    const records = selectedIds.map(sid => ({ subject_id: subjectId, student_id: sid }));
    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50);
      const { error } = await supabase.from('student_subjects').insert(batch);
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
    }
    showToast(`${records.length} student(s) mapped to subject`);
    onClose();
  };

  const selectedSubject = subjects.find((s: any) => s.id === subjectId);

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title="Map Subject to Students" onClose={onClose} />
      <ModalBody>
        {/* Step 1: Select Subject */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--text2))' }}>
            <i className="fas fa-book mr-1.5" />Step 1 — Select Subject
          </div>
          <FieldSelect value={subjectId} onChange={v => { setSubjectId(v); setSelectedIds([]); }}
            options={[{ value: '', label: '— Select Subject —' }, ...subjects.map((s: any) => ({ value: s.id, label: `${s.name} (${s.code || ''})` }))]} />
        </div>

        {/* Dynamic Teacher Match */}
        {subjectId && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text2))' }}>
              <i className="fas fa-chalkboard-teacher mr-1.5" />Teachers for {selectedSubject?.name}
            </div>
            {matchedTeachers.length === 0 ? (
              <div className="text-[11px]" style={{ color: 'hsl(var(--text3))' }}>No teachers assigned to this subject yet.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {matchedTeachers.map((t: any, i: number) => (
                  <span key={i} className="rounded-[5px] px-2.5 py-1 text-[11px] font-semibold" style={{ background: '#ddf4ff', color: '#0969da' }}>
                    <i className="fas fa-user mr-1" />{t.name}
                    {t.department && <span className="font-normal ml-1 text-[9px]" style={{ color: '#0969da99' }}>({t.department})</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Students */}
        {subjectId && (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--text2))' }}>
              <i className="fas fa-users mr-1.5" />Step 2 — Select Students
            </div>
            <div className="flex gap-2 mb-3">
              <FieldSelect value={filterForm} onChange={v => { setFilterForm(v); setFilterClass(''); setSelectedIds([]); }}
                options={FORMS.map(f => ({ value: f, label: f }))} />
              <FieldSelect value={filterClass} onChange={setFilterClass}
                options={[{ value: '', label: 'All Classes' }, ...availableClasses.map(c => ({ value: c, label: c }))]} />
              <input
                className="flex-1 h-[34px] rounded-md border px-3 text-[12px]"
                style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface1))' }}
                placeholder="🔍 Search student name or enrollment..."
                value={searchStr} onChange={e => setSearchStr(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mb-2">
              <div className="text-[11px] font-semibold" style={{ color: 'hsl(var(--text2))' }}>
                {unmappedStudents.length} available · {mappedStudents.length} already mapped
              </div>
              <Btn variant="outline" size="sm" onClick={selectAll}>
                {unmappedStudents.length > 0 && unmappedStudents.every(s => selectedIds.includes(s.id)) ? 'Deselect All' : 'Select All'}
              </Btn>
            </div>

            <div className="max-h-[280px] overflow-y-auto border rounded-md" style={{ borderColor: 'hsl(var(--border))' }}>
              {unmappedStudents.length === 0 && mappedStudents.length === 0 && (
                <div className="py-6 text-center text-[11px]" style={{ color: 'hsl(var(--text3))' }}>No students found</div>
              )}
              {unmappedStudents.map((s: any) => (
                <label key={s.id} className="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-[hsl(var(--surface2))] text-[12px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
                  <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleStudent(s.id)} className="accent-[#1a3fa0]" />
                  <span className="font-semibold flex-1">{s.full_name}</span>
                  <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text3))' }}>{s.enrollment_number || '—'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--surface2))', color: 'hsl(var(--text2))' }}>{s.class_name || '—'}</span>
                </label>
              ))}
              {mappedStudents.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase" style={{ background: 'hsl(var(--surface2))', color: 'hsl(var(--text3))' }}>Already Mapped</div>
                  {mappedStudents.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2 py-2 px-3 text-[12px] opacity-50" style={{ borderBottom: '1px solid #f6f8fa' }}>
                      <i className="fas fa-check text-[10px]" style={{ color: '#1a7f37' }} />
                      <span className="flex-1">{s.full_name}</span>
                      <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text3))' }}>{s.enrollment_number || '—'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--surface2))', color: 'hsl(var(--text2))' }}>{s.class_name || '—'}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="text-[10px] mt-1.5" style={{ color: 'hsl(var(--text3))' }}>{selectedIds.length} student(s) selected for mapping</div>
          </>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving || selectedIds.length === 0}>
          {saving ? 'Mapping…' : `Map ${selectedIds.length} Student${selectedIds.length !== 1 ? 's' : ''}`}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}

function ClassTeacherModal({ teachers, students, onClose }: { teachers: any[]; students: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const [teacherId, setTeacherId] = useState('');
  const [form, setForm] = useState('Form 1');
  const [className, setClassName] = useState('');
  const [saving, setSaving] = useState(false);

  const classes = [...new Set(students.filter((s: any) => s.form === form).map((s: any) => s.class_name).filter(Boolean))].sort();

  const save = async () => {
    if (!teacherId || !form || !className) return;
    setSaving(true);
    const { error } = await (supabase.from('class_teachers') as any).insert({ teacher_id: teacherId, form, class_name: className });
    if (error) { showToast(error.message, 'error'); setSaving(false); return; }
    showToast('Class teacher assigned');
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title="Assign Class Teacher" onClose={onClose} />
      <ModalBody>
        <Field label="Teacher" required>
          <FieldSelect value={teacherId} onChange={setTeacherId}
            options={[{ value: '', label: '— Select —' }, ...teachers.map((t: any) => ({ value: t.id, label: t.name }))]} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Form" required>
            <FieldSelect value={form} onChange={setForm} options={FORMS.map(f => ({ value: f, label: f }))} />
          </Field>
          <Field label="Class" required>
            <FieldSelect value={className} onChange={setClassName}
              options={[{ value: '', label: '— Select —' }, ...classes.map(c => ({ value: c, label: c }))]} />
          </Field>
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Assign'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
