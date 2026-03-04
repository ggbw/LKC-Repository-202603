import React, { useState } from 'react';
import { useExams, useExamResults, useSubjects, useStudents, useTeachers, useInvalidate } from '@/hooks/useSupabaseData';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { FORMS, cap, formatDate, G, P } from '@/data/database';
import { downloadExcel } from '@/lib/excel';
import { Badge, Card, StatCard, Btn, BackBtn, GradeChip, FilterSelect,
  Modal, ModalHead, ModalBody, ModalFoot, Field, FieldInput, FieldSelect } from '@/components/SharedUI';

export default function ExamsPage() {
  const { detail, setDetail, showToast } = useApp();
  const { isAdmin, isHOD } = useAuth();
  const { data: exams = [], isLoading } = useExams();
  const { data: results = [] } = useExamResults();
  const invalidate = useInvalidate();
  const [modal, setModal] = useState(false);

  if (detail) return <ExamDetail id={detail} onBack={() => setDetail(null)} />;

  const confirmed = exams.filter((e: any) => e.state === 'confirmed').length;

  const handleExport = () => {
    downloadExcel(exams.map((e: any) => ({
      'Name': e.name, 'Form': e.form, 'Status': cap(e.state || 'draft'),
      'Start': e.start_date || '', 'End': e.end_date || '',
    })), 'exams_export', 'Exams');
    showToast('Exported');
  };

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold"><i className="fas fa-clipboard-list mr-2" />Examinations</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{exams.length} exam periods</div></div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}><i className="fas fa-download mr-1" />Export</Btn>
          {(isAdmin || isHOD) && <Btn onClick={() => setModal(true)}><i className="fas fa-plus mr-1" />New Exam</Btn>}
        </div>
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
        <StatCard icon="fas fa-clipboard-list" bg="#ddf4ff" value={exams.length} label="Total Exams" />
        <StatCard icon="fas fa-check-circle" bg="#dafbe1" value={confirmed} label="Confirmed" />
        <StatCard icon="fas fa-chart-bar" bg="#fbefff" value={results.length} label="Results Entered" />
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {exams.map((e: any) => {
          const examResults = results.filter((r: any) => r.exam_name === e.name);
          return (
            <Card key={e.id}>
              <div className="flex justify-between mb-2.5">
                <div className="font-bold text-sm">{e.name}</div>
                <Badge status={e.state || 'draft'} />
              </div>
              <div className="text-[11px] mb-0.5" style={{ color: 'hsl(var(--text2))' }}><i className="fas fa-school mr-1" />{e.form}</div>
              <div className="text-[11px] mb-0.5" style={{ color: 'hsl(var(--text2))' }}><i className="fas fa-calendar-alt mr-1" />{formatDate(e.start_date)} → {formatDate(e.end_date)}</div>
              <div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}><i className="fas fa-chart-bar mr-1" />{examResults.length} results</div>
              <div className="mt-3 pt-2.5 flex gap-1.5" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <Btn variant="primary" size="sm" onClick={() => setDetail(e.id)}><i className="fas fa-eye mr-1" />View</Btn>
                {(isAdmin || isHOD) && e.state === 'draft' && (
                  <Btn variant="outline" size="sm" onClick={async () => {
                    await supabase.from('exams').update({ state: 'confirmed' }).eq('id', e.id);
                    invalidate(['exams']);
                    showToast('Exam confirmed');
                  }}><i className="fas fa-check mr-1" />Confirm</Btn>
                )}
                {isAdmin && (
                  <Btn variant="danger" size="sm" onClick={async () => {
                    if (!confirm('Delete this exam?')) return;
                    await supabase.from('exams').delete().eq('id', e.id);
                    invalidate(['exams']);
                    showToast('Deleted');
                  }}><i className="fas fa-trash" /></Btn>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {modal && <ExamModal onClose={() => { setModal(false); invalidate(['exams']); }} />}
    </div>
  );
}

function ExamDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { showToast } = useApp();
  const { isAdmin, isHOD, isTeacher } = useAuth();
  const { data: exams = [] } = useExams();
  const { data: subjects = [] } = useSubjects();
  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const invalidate = useInvalidate();
  const exam = exams.find((e: any) => e.id === id) as any;
  const { data: results = [] } = useExamResults(exam?.name);
  const [resultModal, setResultModal] = useState(false);
  const [filterSubject, setFilterSubject] = useState('');

  if (!exam) return <><BackBtn onClick={onBack} label="Back" /><div>Not found</div></>;

  const filtResults = results.filter((r: any) => !filterSubject || r.subject_id === filterSubject);
  const subjectsInResults = [...new Set(results.map((r: any) => r.subject_id))];

  const handleExport = () => {
    downloadExcel(filtResults.map((r: any) => {
      const p = P(Number(r.obtained_marks), Number(r.max_marks));
      return {
        'Student': r.students?.full_name || '', 'Enrollment': r.students?.enrollment_number || '',
        'Subject': r.subjects?.name || '', 'Obtained': r.obtained_marks, 'Max': r.max_marks,
        '%': p, 'Grade': G(p),
      };
    }), `${exam.name}_results`, 'Results');
    showToast('Exported');
  };

  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Examinations" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>
          <i className="fas fa-clipboard-list" style={{ fontSize: '28px', color: 'hsl(var(--accent-blue))' }} />
        </div>
        <div>
          <div className="text-xl font-bold">{exam.name}</div>
          <div className="flex gap-2 items-center mt-1.5"><Badge status={exam.state || 'draft'} /><span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{exam.form}</span></div>
          <div className="text-xs mt-1" style={{ color: 'hsl(var(--text2))' }}><i className="fas fa-calendar-alt mr-1" />{formatDate(exam.start_date)} → {formatDate(exam.end_date)}</div>
        </div>
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <StatCard icon="fas fa-chart-bar" bg="#ddf4ff" value={results.length} label="Results" />
        <StatCard icon="fas fa-graduation-cap" bg="#dafbe1" value={[...new Set(results.map((r: any) => r.student_id))].length} label="Students" />
        <StatCard icon="fas fa-book" bg="#fbefff" value={subjectsInResults.length} label="Subjects" />
      </div>

      <Card title={`Results (${filtResults.length})`} titleRight={
        <div className="flex gap-2">
          <FilterSelect value={filterSubject} onChange={setFilterSubject} allLabel="All Subjects"
            options={subjects.filter((s: any) => subjectsInResults.includes(s.id)).map((s: any) => ({ value: s.id, label: s.name }))} />
          <Btn variant="outline" size="sm" onClick={handleExport}><i className="fas fa-download mr-1" />Export</Btn>
          {(isAdmin || isHOD || isTeacher) && <Btn size="sm" onClick={() => setResultModal(true)}><i className="fas fa-plus mr-1" />Add Results</Btn>}
        </div>
      }>
        {filtResults.length === 0 ? (
          <div className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text3))' }}>No results yet. Click "Add Results" to enter marks.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                {['Student','Form','Subject','Marks','%','Grade'].map(h => (
                  <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtResults.slice(0, 100).map((r: any) => {
                  const p = P(Number(r.obtained_marks), Number(r.max_marks));
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f6f8fa' }}>
                      <td className="py-2.5 px-3.5 font-semibold">{r.students?.full_name || '—'}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{r.students?.form || '—'}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{r.subjects?.name || '—'}</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px]">{r.obtained_marks}/{r.max_marks}</td>
                      <td className="py-2.5 px-3.5 font-mono font-bold">{p}%</td>
                      <td className="py-2.5 px-3.5"><GradeChip grade={G(p)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {resultModal && <ResultModal examName={exam.name} subjects={subjects} students={students} teachers={teachers}
        onClose={() => { setResultModal(false); invalidate(['exam_results']); }} />}
    </div>
  );
}

function ExamModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [form, setForm] = useState('All Forms');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('exams').insert({
      name, form, start_date: startDate || null, end_date: endDate || null, state: 'draft',
    });
    if (error) { showToast(error.message, 'error'); setSaving(false); return; }
    showToast('Exam created');
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title="New Examination" onClose={onClose} />
      <ModalBody>
        <Field label="Exam Name" required><FieldInput value={name} onChange={setName} placeholder="e.g. Mid-Term 1 2026" /></Field>
        <Field label="Form"><FieldSelect value={form} onChange={setForm} options={[{ value: 'All Forms', label: 'All Forms' }, ...FORMS.map(f => ({ value: f, label: f }))]} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date"><FieldInput value={startDate} onChange={setStartDate} type="date" /></Field>
          <Field label="End Date"><FieldInput value={endDate} onChange={setEndDate} type="date" /></Field>
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Btn>
      </ModalFoot>
    </Modal>
  );
}

function ResultModal({ examName, subjects, students, teachers, onClose }: {
  examName: string; subjects: any[]; students: any[]; teachers: any[]; onClose: () => void;
}) {
  const { showToast } = useApp();
  const { user } = useAuth();
  const [subjectId, setSubjectId] = useState('');
  const [filterForm, setFilterForm] = useState('Form 1');
  const [maxMarks, setMaxMarks] = useState('100');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const formStudents = students.filter((s: any) => s.form === filterForm && s.state === 'active');

  const save = async () => {
    if (!subjectId) return;
    setSaving(true);
    const teacher = teachers.find((t: any) => t.user_id === user?.id);
    const records = Object.entries(marks)
      .filter(([, v]) => v !== '')
      .map(([studentId, obtained]) => ({
        exam_name: examName, student_id: studentId, subject_id: subjectId,
        obtained_marks: Number(obtained), max_marks: Number(maxMarks),
        teacher_id: teacher?.id || null, state: 'done',
      }));
    if (records.length === 0) { showToast('Enter at least one mark', 'error'); setSaving(false); return; }
    const { error } = await supabase.from('exam_results').insert(records);
    if (error) { showToast(error.message, 'error'); setSaving(false); return; }
    showToast(`${records.length} results saved`);
    onClose();
  };

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title={`Add Results — ${examName}`} onClose={onClose} />
      <ModalBody>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Field label="Subject" required>
            <FieldSelect value={subjectId} onChange={setSubjectId}
              options={[{ value: '', label: '— Select —' }, ...subjects.map((s: any) => ({ value: s.id, label: s.name }))]} />
          </Field>
          <Field label="Form">
            <FieldSelect value={filterForm} onChange={setFilterForm} options={FORMS.map(f => ({ value: f, label: f }))} />
          </Field>
          <Field label="Max Marks"><FieldInput value={maxMarks} onChange={setMaxMarks} type="number" /></Field>
        </div>
        {subjectId && formStudents.length > 0 && (
          <div className="overflow-y-auto" style={{ maxHeight: '350px' }}>
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                {['Student','Enrollment','Marks'].map(h => (
                  <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {formStudents.map((s: any) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <td className="py-2 px-3.5 font-semibold">{s.full_name}</td>
                    <td className="py-2 px-3.5 font-mono text-[11px]">{s.enrollment_number || '—'}</td>
                    <td className="py-2 px-3.5">
                      <input type="number" min="0" max={maxMarks} value={marks[s.id] || ''}
                        onChange={e => setMarks(m => ({ ...m, [s.id]: e.target.value }))}
                        className="w-20 border rounded py-1 px-2 text-[12px] font-mono outline-none"
                        style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface2))' }}
                        placeholder="—" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {subjectId && formStudents.length === 0 && (
          <div className="text-xs py-4 text-center" style={{ color: 'hsl(var(--text3))' }}>No active students in {filterForm}</div>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Results'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
