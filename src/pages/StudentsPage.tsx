import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useStudents, useTeachers, useSubjects, useSubjectTeachers, useStudentSubjects, useClassTeachers, useInvalidate } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { FORMS, cap, formatDate } from '@/data/database';
import { downloadExcel, parseExcel, triggerFileUpload } from '@/lib/excel';
import { Badge, Card, InfoRow, SearchBar, FilterSelect, Btn, BackBtn,
  Modal, ModalHead, ModalBody, ModalFoot, FormSection, Field, FieldInput, FieldSelect } from '@/components/SharedUI';

export default function StudentsPage() {
  const { detail, setDetail, showToast } = useApp();
  const { isAdmin, isTeacher, user } = useAuth();
  const { data: students = [], isLoading } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const { data: subjects = [] } = useSubjects();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: studentSubjects = [] } = useStudentSubjects();
  const { data: classTeachers = [] } = useClassTeachers();
  const [search, setSearch] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterState, setFilterState] = useState('');
  const [modal, setModal] = useState<string | 'new' | null>(null);
  const invalidate = useInvalidate();

  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);

  // For teachers: get subject IDs and class assignments
  const mySubjectIds = useMemo(() => {
    if (!myTeacher) return [];
    return subjectTeachers.filter((st: any) => st.teacher_id === myTeacher.id).map((st: any) => st.subject_id);
  }, [subjectTeachers, myTeacher]);

  const myClassAssignments = useMemo(() => {
    if (!myTeacher) return [];
    return classTeachers.filter((ct: any) => ct.teacher_id === myTeacher.id);
  }, [classTeachers, myTeacher]);

  // Teachers only see students taking their subjects or in their class teacher classes
  const visibleStudents = useMemo(() => {
    if (isAdmin) return students;
    if (isTeacher && myTeacher) {
      const subjectStudentIds = new Set(
        studentSubjects
          .filter((ss: any) => mySubjectIds.includes(ss.subject_id))
          .map((ss: any) => ss.student_id)
      );
      const classStudentIds = new Set(
        students
          .filter((s: any) => myClassAssignments.some((ct: any) => ct.form === s.form && ct.class_name === s.class_name))
          .map((s: any) => s.id)
      );
      return students.filter((s: any) => subjectStudentIds.has(s.id) || classStudentIds.has(s.id));
    }
    return students;
  }, [students, isAdmin, isTeacher, myTeacher, mySubjectIds, myClassAssignments, studentSubjects]);

  // For teacher view: map student → subjects taught by this teacher
  const studentSubjectMap = useMemo(() => {
    if (!isTeacher || !myTeacher) return {};
    const map: Record<string, string[]> = {};
    for (const ss of studentSubjects) {
      if (mySubjectIds.includes(ss.subject_id)) {
        const subj = subjects.find((s: any) => s.id === ss.subject_id);
        if (subj) {
          if (!map[ss.student_id]) map[ss.student_id] = [];
          map[ss.student_id].push(subj.name);
        }
      }
    }
    return map;
  }, [isTeacher, myTeacher, studentSubjects, mySubjectIds, subjects]);

  // For teacher view: which students are in class teacher classes
  const classTeacherStudentIds = useMemo(() => {
    if (!isTeacher || !myTeacher) return new Set<string>();
    return new Set(
      students
        .filter((s: any) => myClassAssignments.some((ct: any) => ct.form === s.form && ct.class_name === s.class_name))
        .map((s: any) => s.id)
    );
  }, [isTeacher, myTeacher, students, myClassAssignments]);

  if (detail) return <StudentDetail id={detail} onBack={() => setDetail(null)} />;

  const rows = visibleStudents.filter((s: any) =>
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
        <div><div className="text-lg font-bold"><i className="fas fa-graduation-cap mr-2" />Students</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{visibleStudents.length} total</div></div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}><i className="fas fa-download mr-1" />Export</Btn>
          {isAdmin && <Btn variant="outline" onClick={handleImport}><i className="fas fa-upload mr-1" />Import</Btn>}
          {isAdmin && <Btn onClick={() => setModal('new')}><i className="fas fa-plus mr-1" />New Student</Btn>}
        </div>
      </div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search name or enrollment...">
          <FilterSelect value={filterForm} onChange={setFilterForm} allLabel="All Forms" options={FORMS.map(f => ({ value: f, label: f }))} />
          <FilterSelect value={filterClass} onChange={setFilterClass} allLabel="All Classes" options={[...new Set(visibleStudents.map((s: any) => s.class_name).filter(Boolean))].sort().map(c => ({ value: c, label: c }))} />
          <FilterSelect value={filterState} onChange={setFilterState} allLabel="All Status" options={['active','suspended','graduated','transferred','inactive'].map(s => ({ value: s, label: cap(s) }))} />
        </SearchBar>
        {rows.length === 0 ? <div className="py-10 text-center text-xs" style={{ color: 'hsl(var(--text3))' }}>No students found</div> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                {['Enrollment','Name','Form','Class','Gender', ...(isTeacher && !isAdmin ? ['Subjects','Relation'] : []), 'Status', ...(isAdmin ? ['Actions'] : [])].map(h => (
                  <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.slice(0, 100).map((s: any) => (
                  <tr key={s.id} className="hover:bg-[hsl(var(--surface2))] transition-colors" style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{s.enrollment_number || '—'}</td>
                    <td className="py-2.5 px-3.5 font-semibold cursor-pointer" style={{ color: '#1a3fa0' }} onClick={() => setDetail(s.id)}>{s.full_name}</td>
                    <td className="py-2.5 px-3.5">{s.form}</td>
                    <td className="py-2.5 px-3.5 text-[11px] font-mono">{s.class_name || '—'}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{cap(s.gender || '')}</td>
                    {isTeacher && !isAdmin && (
                      <>
                        <td className="py-2.5 px-3.5 text-[10px]" style={{ color: 'hsl(var(--text2))' }}>
                          {(studentSubjectMap[s.id] || []).join(', ') || '—'}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="flex gap-1">
                            {(studentSubjectMap[s.id] || []).length > 0 && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#ddf4ff', color: '#0969da' }}>Subject</span>
                            )}
                            {classTeacherStudentIds.has(s.id) && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#dafbe1', color: '#1a7f37' }}>My Class</span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="py-2.5 px-3.5"><Badge status={s.state || 'active'} /></td>
                    {isAdmin && (
                      <td className="py-2.5 px-3.5">
                        <div className="flex gap-1">
                          <Btn variant="outline" size="sm" onClick={(e: any) => { e.stopPropagation(); setModal(s.id); }}><i className="fas fa-edit" /></Btn>
                          <Btn variant="danger" size="sm" onClick={async (e: any) => {
                            e.stopPropagation();
                            if (!confirm('Delete this student?')) return;
                            await supabase.from('students').delete().eq('id', s.id);
                            invalidate(['students']);
                            showToast('Student deleted');
                          }}><i className="fas fa-trash" /></Btn>
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
  const { data: studentSubjects = [] } = useStudentSubjects(id);
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const { data: classTeachers = [] } = useClassTeachers();
  const s = students.find((x: any) => x.id === id) as any;
  if (!s) return <><BackBtn onClick={onBack} label="Back" /><div>Not found</div></>;

  const classTeacher = classTeachers.find((ct: any) => ct.form === s.form && ct.class_name === s.class_name);

  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Students" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>
          <i className={`fas fa-${s.gender === 'female' ? 'female' : 'male'}`} style={{ fontSize: '28px', color: '#1a3fa0' }} />
        </div>
        <div>
          <div className="text-xl font-bold">{s.full_name}</div>
          <div className="flex gap-2 items-center flex-wrap mt-1.5">
            <Badge status={s.state || 'active'} />
            <span className="text-[11px] font-mono" style={{ color: 'hsl(var(--text2))' }}>{s.enrollment_number}</span>
            <span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{s.form} {s.class_name || ''}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title={<><i className="fas fa-id-card mr-1.5" />Personal Information</>}>
          {[['Date of Birth', formatDate(s.date_of_birth)], ['Gender', cap(s.gender || '')], ['Form', s.form], ['Class', s.class_name || '—'], ['Enrollment', s.enrollment_number || '—'], ['Email', s.email || '—'], ['Nationality', s.nationality || '—'], ['Admission Date', formatDate(s.admission_date)]].map(([k, v]) => (
            <InfoRow key={k} label={k} value={v} />
          ))}
        </Card>
        <div>
          <Card title={<><i className="fas fa-chalkboard-teacher mr-1.5" />Class Teacher</>} className="mb-4">
            <div className="text-[12.5px]">
              {classTeacher ? (
                <span className="font-semibold">{classTeacher.teachers?.name}</span>
              ) : (
                <span style={{ color: 'hsl(var(--text3))' }}>Not assigned</span>
              )}
            </div>
          </Card>
          <Card title={<><i className="fas fa-book mr-1.5" />Subjects ({studentSubjects.length})</>}>
            {studentSubjects.length === 0 ? (
              <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No subjects assigned</div>
            ) : (
              studentSubjects.map((ss: any) => {
                const teacherMappings = subjectTeachers.filter((st: any) => st.subject_id === ss.subject_id);
                return (
                  <div key={ss.id} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <span className="font-semibold">{ss.subjects?.name} <span className="font-mono text-[9px]" style={{ color: 'hsl(var(--text3))' }}>{ss.subjects?.code}</span></span>
                    <span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>
                      {teacherMappings.map((tm: any) => tm.teachers?.name).filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>
                );
              })
            )}
          </Card>
        </div>
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
      <ModalHead title={id ? 'Edit Student' : 'Add Student'} onClose={onClose} />
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
