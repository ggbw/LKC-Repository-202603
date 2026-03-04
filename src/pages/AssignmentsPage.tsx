import React, { useState } from 'react';
import { useAssignments, useSubmissions, useSubjects, useTeachers, useInvalidate } from '@/hooks/useSupabaseData';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { FORMS, cap, formatDate, formatDateTime } from '@/data/database';
import { downloadExcel } from '@/lib/excel';
import { Badge, Card, StatCard, SearchBar, Btn, BackBtn,
  Modal, ModalHead, ModalBody, ModalFoot, Field, FieldInput, FieldSelect } from '@/components/SharedUI';

export default function AssignmentsPage() {
  const { detail, setDetail, showToast } = useApp();
  const { isAdmin, isTeacher } = useAuth();
  const { data: assignments = [], isLoading } = useAssignments();
  const { data: submissions = [] } = useSubmissions();
  const { data: subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  const invalidate = useInvalidate();
  const [modal, setModal] = useState(false);

  if (detail) return <AssignmentDetail id={detail} onBack={() => setDetail(null)} />;

  const handleExport = () => {
    downloadExcel(assignments.map((a: any) => ({
      'Title': a.title, 'Subject': a.subjects?.name || '', 'Form': a.form,
      'Due Date': a.due_date || '', 'Status': cap(a.state || 'draft'),
      'Total Marks': a.total_marks || '',
    })), 'assignments_export', 'Assignments');
    showToast('Exported');
  };

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  const pubCount = assignments.filter((a: any) => a.state === 'published').length;

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold"><i className="fas fa-tasks mr-2" />Assignments</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{assignments.length} total</div></div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}><i className="fas fa-download mr-1" />Export</Btn>
          {(isAdmin || isTeacher) && <Btn onClick={() => setModal(true)}><i className="fas fa-plus mr-1" />Create Assignment</Btn>}
        </div>
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
        <StatCard icon="fas fa-tasks" bg="#ddf4ff" value={assignments.length} label="Total" />
        <StatCard icon="fas fa-check-circle" bg="#dafbe1" value={pubCount} label="Published" />
        <StatCard icon="fas fa-inbox" bg="#fff8c5" value={submissions.length} label="Submissions" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Title','Subject','Form','Due Date','Status','Submissions', ...(isAdmin ? ['Actions'] : [])].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {assignments.map((a: any) => {
                const subs = submissions.filter((s: any) => s.assignment_id === a.id);
                return (
                  <tr key={a.id} className="hover:bg-[hsl(var(--surface2))] cursor-pointer" style={{ borderBottom: '1px solid #f6f8fa' }}
                    onClick={() => setDetail(a.id)}>
                    <td className="py-2.5 px-3.5 font-semibold" style={{ color: '#1f6feb' }}>{a.title}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{a.subjects?.name || '—'}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{a.form}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]">{formatDate(a.due_date)}</td>
                    <td className="py-2.5 px-3.5"><Badge status={a.state || 'draft'} /></td>
                    <td className="py-2.5 px-3.5 font-mono text-center">{subs.length}</td>
                    {isAdmin && (
                      <td className="py-2.5 px-3.5">
                        <Btn variant="danger" size="sm" onClick={async (e: any) => {
                          e.stopPropagation();
                          if (!confirm('Delete?')) return;
                          await supabase.from('assignments').delete().eq('id', a.id);
                          invalidate(['assignments']);
                          showToast('Deleted');
                        }}>🗑</Btn>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && <AssignmentModal subjects={subjects} teachers={teachers} onClose={() => { setModal(false); invalidate(['assignments']); }} />}
    </div>
  );
}

function AssignmentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: assignments = [] } = useAssignments();
  const { data: submissions = [] } = useSubmissions(id);
  const a = assignments.find((x: any) => x.id === id) as any;

  if (!a) return <><BackBtn onClick={onBack} label="Back" /><div>Not found</div></>;

  return (
    <div className="page-animate">
      <BackBtn onClick={onBack} label="Back to Assignments" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center text-[32px] flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>📝</div>
        <div>
          <div className="text-xl font-bold">{a.title}</div>
          <div className="flex gap-2 items-center mt-1.5"><Badge status={a.state || 'draft'} /><span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{a.subjects?.name} · {a.form}</span></div>
          <div className="text-xs mt-1" style={{ color: 'hsl(var(--text2))' }}>Due: {formatDateTime(a.due_date)} · {a.total_marks ? a.total_marks + ' marks' : ''}</div>
        </div>
      </div>

      {a.description && (
        <Card title="Description" className="mb-3.5">
          <div className="text-[12.5px] whitespace-pre-wrap" style={{ color: 'hsl(var(--text2))' }}>{a.description}</div>
        </Card>
      )}

      <Card title={`Submissions (${submissions.length})`}>
        {submissions.length === 0 ? (
          <div className="text-xs py-4" style={{ color: 'hsl(var(--text3))' }}>No submissions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                {['Student','Submitted','Marks','Status'].map(h => (
                  <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {submissions.map((s: any) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <td className="py-2.5 px-3.5 font-semibold">{s.students?.full_name || '—'}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]">{formatDateTime(s.submitted_at)}</td>
                    <td className="py-2.5 px-3.5 font-mono">{s.obtained_marks !== null ? `${s.obtained_marks}/${a.total_marks || '?'}` : '—'}</td>
                    <td className="py-2.5 px-3.5"><Badge status={s.status || 'submitted'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function AssignmentModal({ subjects, teachers, onClose }: { subjects: any[]; teachers: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [form, setForm] = useState('Form 1');
  const [subjectId, setSubjectId] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const teacher = teachers.find((t: any) => t.user_id === user?.id);
    const { error } = await supabase.from('assignments').insert({
      title, form, subject_id: subjectId || null, description: desc,
      due_date: dueDate || null, total_marks: totalMarks ? Number(totalMarks) : null,
      teacher_id: teacher?.id || teachers[0]?.id, state: 'draft',
    });
    if (error) { showToast(error.message, 'error'); setSaving(false); return; }
    showToast('Assignment created');
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title="📝 Create Assignment" onClose={onClose} />
      <ModalBody>
        <Field label="Title" required><FieldInput value={title} onChange={setTitle} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Form"><FieldSelect value={form} onChange={setForm} options={FORMS.map(f => ({ value: f, label: f }))} /></Field>
          <Field label="Subject">
            <FieldSelect value={subjectId} onChange={setSubjectId}
              options={[{ value: '', label: '— Select —' }, ...subjects.map((s: any) => ({ value: s.id, label: s.name }))]} />
          </Field>
        </div>
        <Field label="Description">
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            className="w-full border rounded-md py-2 px-2.5 text-[12.5px] font-sans outline-none resize-y"
            style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface2))' }} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due Date"><FieldInput value={dueDate} onChange={setDueDate} type="datetime-local" /></Field>
          <Field label="Total Marks"><FieldInput value={totalMarks} onChange={setTotalMarks} type="number" /></Field>
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
