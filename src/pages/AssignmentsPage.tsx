import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DB, DEMO_TEACHER, DEMO_STUDENT, FORMS, DIVS, SUBJECTS, SUB_TYPES,
  cap, G, P, isPastDue, daysLeft, formatDate, formatDateTime, getMyAssignments, getMySubmission,
  type Assignment } from '@/data/database';
import { Badge, Card, StatCard, InfoRow, CountdownTag, GradeChip, Btn, BackBtn,
  Modal, ModalHead, ModalBody, ModalFoot, FormSection, Field, FieldInput, FieldSelect, FieldTextarea, DeleteModal } from '@/components/SharedUI';

export default function AssignmentsPage() {
  const { role } = useApp();
  if (role === 'student') return <StudentAssignments />;
  return <TeacherAssignments />;
}

function TeacherAssignments() {
  const { role, asnDetail, setAsnDetail, asnSubDetail, setAsnSubDetail, showToast, refresh, tick } = useApp();
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<number | null>(null);
  const [delModal, setDelModal] = useState<{ id: number; name: string } | null>(null);

  if (asnSubDetail !== null) return <SubmissionDetail />;
  if (asnDetail !== null) return <AssignmentSubmissions />;

  const myA = role === 'admin' ? DB.assignments : DB.assignments.filter(a => a.teacher_id === DEMO_TEACHER.id);
  const pubCount = myA.filter(a => a.state === 'published').length;
  const subCount = DB.submissions.filter(s => myA.some(a => a.id === s.assignment_id)).length;

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold">Assignments</div>
          <div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{role === 'admin' ? 'GET /api/assignments/ — all' : 'GET /api/assignments/?teacher=me'} · {myA.length} total</div>
        </div>
        <Btn onClick={() => setCreateModal(true)}>＋ Create Assignment</Btn>
      </div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
        <StatCard icon="📝" bg="#ddf4ff" value={myA.length} label="Total Created" />
        <StatCard icon="🟢" bg="#dafbe1" value={pubCount} label="Published" />
        <StatCard icon="📬" bg="#fff8c5" value={subCount} label="Submissions" />
        <StatCard icon="⭐" bg="#fbefff" value={DB.submissions.filter(s => s.status === 'graded').length} label="Graded" />
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Title','Subject','Class','Due Date','Marks','Type','Submissions','Status','Actions'].map(h => (
                <th key={h} className={`py-[9px] px-3.5 text-[10px] font-semibold uppercase tracking-wide ${h === 'Actions' || h === 'Marks' ? 'text-center' : 'text-left'} whitespace-nowrap`} style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {myA.length === 0 && <tr><td colSpan={9} className="text-center py-8" style={{ color: 'hsl(var(--text3))' }}>No assignments yet.</td></tr>}
              {myA.map(a => {
                const subs = DB.submissions.filter(s => s.assignment_id === a.id);
                const graded = subs.filter(s => s.status === 'graded').length;
                const over = isPastDue(a);
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f6f8fa' }} className="hover:bg-[hsl(var(--surface2))]">
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold cursor-pointer" style={{ color: '#1f6feb' }} onClick={() => { setAsnDetail(a.id); setAsnSubDetail(null); }}>{a.title}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text3))' }}>{over && a.state === 'published' ? <span style={{ color: '#f85149' }}>⚠ Past due</span> : <CountdownTag assignment={a} />}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-[11px]">{a.subject || '—'}</td>
                    <td className="py-2.5 px-3.5 text-[11px] font-mono">{a.form.replace('Form ', '')}{a.division ? ' · ' + a.division : ''}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]">{formatDate(a.due_date)}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-center">{a.total_marks || '—'}</td>
                    <td className="py-2.5 px-3.5"><Badge status={a.submission_type === 'file' ? 'file' : a.submission_type === 'text' ? 'text' : 'both'} /></td>
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="font-bold font-mono">{subs.length}</div>
                      <div className="text-[10px]" style={{ color: 'hsl(var(--text2))' }}>{graded} graded</div>
                      {subs.length > 0 && <div className="stats-bar"><div style={{ flex: graded, background: '#1a7f37' }} /><div style={{ flex: subs.length - graded, background: '#addcff' }} /></div>}
                    </td>
                    <td className="py-2.5 px-3.5"><Badge status={a.state} /></td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <Btn variant="outline" size="sm" onClick={() => { setAsnDetail(a.id); setAsnSubDetail(null); }}>👁</Btn>
                      <Btn variant="outline" size="sm" className="ml-1" onClick={() => setEditModal(a.id)}>✏️</Btn>
                      <Btn variant="outline" size="sm" className="ml-1" onClick={() => setDelModal({ id: a.id, name: a.title })} style={{ background: '#ffebe9', color: '#cf222e', borderColor: '#ffc1ba' }}>🗑</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {createModal && <AssignmentModal id={null} onClose={() => setCreateModal(false)} />}
      {editModal !== null && <AssignmentModal id={editModal} onClose={() => setEditModal(null)} />}
      {delModal && <DeleteModal title="Delete Assignment?" message={`"${delModal.name}" will be permanently removed.`}
        warning={DB.submissions.filter(s => s.assignment_id === delModal.id).length > 0 ? `⚠️ This has ${DB.submissions.filter(s => s.assignment_id === delModal.id).length} submission(s) which will also be deleted.` : undefined}
        api={`DELETE /api/assignments/${delModal.id}/`}
        onClose={() => setDelModal(null)} onConfirm={() => {
          const i = DB.assignments.findIndex(a => a.id === delModal.id);
          if (i > -1) DB.assignments.splice(i, 1);
          DB.submissions = DB.submissions.filter(s => s.assignment_id !== delModal.id);
          setDelModal(null); showToast(`"${delModal.name}" deleted`, 'info'); refresh();
        }} />}
    </div>
  );
}

function AssignmentSubmissions() {
  const { asnDetail: aid, setAsnDetail, setAsnSubDetail, tick } = useApp();
  const a = DB.assignments.find(x => x.id === aid);
  if (!a) return <><BackBtn onClick={() => setAsnDetail(null)} label="Back" /><div>Not found</div></>;

  const classStu = DB.students.filter(s => s.form === a.form && s.state === 'active' && (!a.division || s.division === a.division));
  const subs = DB.submissions.filter(s => s.assignment_id === aid);
  const subMap = new Map(subs.map(s => [s.student_id, s]));
  const graded = subs.filter(s => s.status === 'graded').length;
  const pending = subs.filter(s => s.status !== 'graded').length;

  return (
    <div className="page-animate">
      <BackBtn onClick={() => { setAsnDetail(null); setAsnSubDetail(null); }} label="Back to Assignments" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center text-[32px] flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>📝</div>
        <div className="flex-1">
          <div className="text-xl font-bold">{a.title}</div>
          <div className="flex gap-2 items-center flex-wrap mt-1"><Badge status={a.state} />{a.subject && <span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{a.subject}</span>}<CountdownTag assignment={a} /></div>
          <div className="text-xs mt-1.5" style={{ color: 'hsl(var(--text2))' }}>{a.form}{a.division ? ' · ' + a.division : ' · All Divisions'} · {a.teacher_name} · Due: {formatDateTime(a.due_date)}{a.total_marks ? ` · ${a.total_marks} marks` : ''}</div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-2xl font-bold font-mono">{subs.length}/{classStu.length}</div>
          <div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>submitted</div>
        </div>
      </div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
        <StatCard icon="✅" bg="#dafbe1" value={subs.length} label="Submitted" />
        <StatCard icon="⭕" bg="#f6f8fa" value={classStu.length - subs.length} label="Not Submitted" />
        <StatCard icon="⭐" bg="#fbefff" value={graded} label="Graded" />
        <StatCard icon="⏳" bg="#fff8c5" value={pending} label="Needs Grading" />
      </div>
      <Card title="Student Submissions" titleRight={<Btn variant="outline" size="sm">⬇ Download All</Btn>}>
        {classStu.map(s => {
          const sub = subMap.get(s.id);
          const isOver = isPastDue(a);
          return (
            <div key={s.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>{s.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[12.5px]">{s.student_full_name}</div>
                <div className="text-[10px]" style={{ color: 'hsl(var(--text2))' }}>{s.enrollment_number} · {s.division}</div>
              </div>
              {sub ? (
                <>
                  <div className="flex-1 min-w-0 px-3">
                    {sub.submission_file && <div className="text-[11px]" style={{ color: '#1f6feb' }}>📎 {sub.submission_file}</div>}
                    <div className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text3))' }}>{formatDateTime(sub.submitted_at)}{sub.is_late ? <span style={{ color: '#f85149' }}> · Late</span> : ''}</div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {sub.obtained_marks !== null && <span className="grade-pill">⭐ {sub.obtained_marks}{a.total_marks ? '/' + a.total_marks : ''}</span>}
                    <Badge status={sub.status} />
                    <Btn variant="blue" size="sm" onClick={() => setAsnSubDetail(sub.id)}>Grade</Btn>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 text-xs px-3" style={{ color: 'hsl(var(--text3))' }}>
                    {isOver ? <span className="font-semibold" style={{ color: '#f85149' }}>⚠ Not submitted (overdue)</span> : 'Not yet submitted'}
                  </div>
                  <div className="flex-shrink-0"><Badge status={isOver ? 'overdue' : 'not_submitted'} /></div>
                </>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function SubmissionDetail() {
  const { asnSubDetail: subId, setAsnSubDetail, showToast, refresh, tick } = useApp();
  const [marks, setMarks] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('submitted');
  const [marksErr, setMarksErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const sub = DB.submissions.find(s => s.id === subId);
  const a = sub ? DB.assignments.find(x => x.id === sub.assignment_id) : null;
  const student = sub ? DB.students.find(s => s.id === sub.student_id) : null;

  if (!initialized && sub) {
    setMarks(sub.obtained_marks !== null ? String(sub.obtained_marks) : '');
    setComment(sub.teacher_comment);
    setStatus(sub.status);
    setInitialized(true);
  }

  if (!sub) return <><BackBtn onClick={() => setAsnSubDetail(null)} label="Back" /><div>Not found</div></>;

  const saveGrade = () => {
    setMarksErr('');
    if (marks !== '' && a?.total_marks && parseInt(marks) > a.total_marks) {
      setMarksErr(`Cannot exceed ${a.total_marks} marks.`); return;
    }
    setSaving(true);
    setTimeout(() => {
      sub.obtained_marks = marks !== '' ? parseInt(marks) : null;
      sub.teacher_comment = comment;
      sub.status = status;
      sub.graded_by = DEMO_TEACHER.name;
      showToast(`Grade saved for ${sub.student_name}`, 'purple');
      setSaving(false); refresh();
    }, 400);
  };

  return (
    <div className="page-animate">
      <BackBtn onClick={() => setAsnSubDetail(null)} label="Back to Submissions" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Card title="Student Information" className="mb-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-2xl" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>{student?.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}</div>
              <div><div className="font-bold text-[15px]">{sub.student_name}</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{sub.student_enrollment} · {sub.student_div}</div></div>
            </div>
            {[['Assignment', a?.title || '—'], ['Subject', a?.subject || '—'], ['Submitted', formatDateTime(sub.submitted_at)], ['Type', sub.is_late ? '⚠ Late' : 'On time'], ['Status', cap(sub.status)]].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}
          </Card>
          <Card title="Submission Content">
            {sub.submission_file && (
              <div className="flex justify-between items-center rounded-md px-3 py-3 mb-2.5" style={{ background: '#f0f6ff', border: '1px solid #addcff' }}>
                <span className="text-xs font-semibold" style={{ color: '#0969da' }}>📎 {sub.submission_file}</span>
                <Btn variant="outline" size="sm">⬇ Download</Btn>
              </div>
            )}
            {sub.submission_text && <div className="rounded-md p-3.5 text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>{sub.submission_text}</div>}
            {!sub.submission_file && !sub.submission_text && <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No content</div>}
          </Card>
        </div>
        <Card title="Grade Submission" titleRight={<span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text3))' }}>POST /api/assignments/submissions/{subId}/grade/</span>}>
          <Field label={`Obtained Marks ${a?.total_marks ? '/ ' + a.total_marks : ''}`} error={marksErr}>
            <FieldInput value={marks} onChange={setMarks} type="number" placeholder="e.g. 42" />
          </Field>
          <Field label="Teacher Comment">
            <FieldTextarea value={comment} onChange={setComment} minHeight="100px" />
          </Field>
          <Field label="Status">
            <FieldSelect value={status} onChange={setStatus} options={[
              { value: 'submitted', label: 'Submitted' },
              { value: 'graded', label: 'Graded' },
              { value: 'returned', label: 'Returned for revision' },
            ]} />
          </Field>
          {sub.obtained_marks !== null && a && (
            <div className="rounded-md p-3 mb-3.5" style={{ background: '#f0fff4', border: '1px solid #aceebb' }}>
              <div className="text-[11px] mb-1" style={{ color: 'hsl(var(--text2))' }}>Current Grade</div>
              <div className="flex items-center gap-3">
                <span className="grade-pill text-sm py-1.5 px-3.5">⭐ {sub.obtained_marks}{a.total_marks ? '/' + a.total_marks : ''}</span>
                {a.total_marks && <GradeChip grade={G(P(sub.obtained_marks, a.total_marks))} />}
                {a.total_marks && <span className="font-mono font-bold">{P(sub.obtained_marks, a.total_marks)}%</span>}
              </div>
            </div>
          )}
          <Btn variant="purple" onClick={saveGrade} disabled={saving} className="w-full">{saving ? 'Saving…' : '⭐ Save Grade'}</Btn>
          {sub.graded_by && <div className="mt-2 text-[10px] text-center" style={{ color: 'hsl(var(--text3))' }}>Last graded by {sub.graded_by}</div>}
        </Card>
      </div>
    </div>
  );
}

function StudentAssignments() {
  const { stuAsnDetail, setStuAsnDetail, tick } = useApp();
  const [tab, setTab] = useState('all');

  if (stuAsnDetail !== null) return <StudentSubmitForm />;

  const myA = getMyAssignments();
  const tabs = [['all', 'All'], ['pending', 'Pending'], ['submitted', 'Submitted'], ['graded', 'Graded']];

  const filtered = myA.filter(a => {
    const sub = getMySubmission(a.id);
    if (tab === 'pending') return !sub;
    if (tab === 'submitted') return sub && sub.status !== 'graded';
    if (tab === 'graded') return sub && sub.status === 'graded';
    return true;
  });

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold">My Assignments</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>GET /api/assignments/?form=Form5 · {myA.length} total</div></div>
      </div>
      <div className="flex mb-[18px]" style={{ borderBottom: '2px solid hsl(var(--border))' }}>
        {tabs.map(([id, label]) => {
          const count = myA.filter(a => { const sub = getMySubmission(a.id); if (id === 'pending') return !sub; if (id === 'submitted') return sub && sub.status !== 'graded'; if (id === 'graded') return sub && sub.status === 'graded'; return true; }).length;
          return (
            <div key={id} onClick={() => setTab(id)}
              className="py-[9px] px-4 text-[12.5px] font-semibold cursor-pointer -mb-[2px] transition-all select-none"
              style={{ color: tab === id ? '#1f6feb' : 'hsl(var(--text2))', borderBottom: `2px solid ${tab === id ? '#1f6feb' : 'transparent'}` }}>
              {label} <span className="text-[10px]" style={{ color: tab === id ? '#1f6feb' : 'hsl(var(--text3))' }}>({count})</span>
            </div>
          );
        })}
      </div>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}>
        {filtered.length === 0 && <div className="col-span-full py-10 text-center text-xs" style={{ color: 'hsl(var(--text3))' }}>No assignments in this category</div>}
        {filtered.map(a => {
          const sub = getMySubmission(a.id);
          const overdue = isPastDue(a) && !sub;
          return (
            <div key={a.id} className="rounded-lg p-[18px] flex flex-col gap-2.5 transition-all hover:shadow-lg hover:-translate-y-px"
              style={{
                background: 'hsl(var(--surface))', border: `1px solid hsl(var(--border))`,
                borderLeft: sub ? (sub.status === 'graded' ? '3px solid #8250df' : '3px solid #2ea043') : overdue ? '3px solid #f85149' : undefined,
                boxShadow: 'var(--shadow)',
              }}>
              <div className="flex justify-between items-start">
                <div className="font-bold text-sm leading-tight">{a.title}</div>
                {sub ? <Badge status={sub.status} /> : <Badge status={a.state} />}
              </div>
              <div className="text-[11px] flex gap-2.5 flex-wrap" style={{ color: 'hsl(var(--text2))' }}>
                {a.subject && <span>📚 {a.subject}</span>}
                <span>👩‍🏫 {a.teacher_name}</span>
                {a.total_marks && <span>📊 {a.total_marks} marks</span>}
              </div>
              <div className="text-xs leading-relaxed overflow-hidden" style={{ color: 'hsl(var(--text2))', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{a.description}</div>
              <div className="flex justify-between items-center mt-1">
                <CountdownTag assignment={a} />
                <div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{SUB_TYPES.find(s => s[0] === a.submission_type)?.[1] || a.submission_type}</div>
              </div>
              <StuAsnCardBottom a={a} sub={sub} overdue={overdue} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StuAsnCardBottom({ a, sub, overdue }: { a: Assignment; sub: any; overdue: boolean }) {
  const { setStuAsnDetail } = useApp();
  if (sub) {
    const bg = sub.status === 'graded' ? '#fbefff' : sub.is_late ? '#fff8c5' : '#f0fff4';
    return (
      <>
        <div className="rounded-md px-2.5 py-2 text-[11px]" style={{ background: bg }}>
          {sub.status === 'graded' ? (
            <>
              <div className="font-semibold" style={{ color: '#8250df' }}>⭐ Marks: {sub.obtained_marks !== null ? sub.obtained_marks + (a.total_marks ? '/' + a.total_marks : '') : 'Pending'}</div>
              {sub.teacher_comment && <div className="mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{sub.teacher_comment}</div>}
            </>
          ) : (
            <div className="font-semibold" style={{ color: sub.is_late ? '#9a6700' : '#1a7f37' }}>✓ Submitted {formatDate(sub.submitted_at)}{sub.is_late ? ' (late)' : ''}</div>
          )}
        </div>
        {((a.state !== 'closed' && !isPastDue(a)) || a.allow_late) && <Btn variant="outline" size="sm" onClick={() => setStuAsnDetail(a.id)}>Resubmit</Btn>}
      </>
    );
  }
  if (overdue && !a.allow_late) {
    return <span className="text-[11px] font-semibold" style={{ color: '#f85149' }}>⚠ Overdue — submissions closed</span>;
  }
  return <Btn onClick={() => setStuAsnDetail(a.id)}>📤 Submit Assignment</Btn>;
}

function StudentSubmitForm() {
  const { stuAsnDetail: aid, setStuAsnDetail, showToast, refresh, tick } = useApp();
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [fileErr, setFileErr] = useState('');
  const [textErr, setTextErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const a = DB.assignments.find(x => x.id === aid);
  const existing = a ? getMySubmission(a.id) : null;
  const isResubmit = !!existing;
  const overdue = a ? isPastDue(a) : false;

  if (!initialized && existing) {
    setText(existing.submission_text || '');
    setInitialized(true);
  }

  if (!a) return <><BackBtn onClick={() => setStuAsnDetail(null)} label="Back" /><div>Not found</div></>;

  const submit = () => {
    setFileErr(''); setTextErr('');
    let ok = true;
    const hasFile = !!fileName;
    const hasText = text.trim().length > 0;
    if (a.submission_type === 'file' && !hasFile) { setFileErr('Please attach a file.'); ok = false; }
    if (a.submission_type === 'text' && !hasText) { setTextErr('Please enter your answer.'); ok = false; }
    if (a.submission_type === 'both' && !hasFile && !hasText) { setFileErr('Please attach a file or enter text.'); ok = false; }
    if (!ok) return;

    setSaving(true);
    setTimeout(() => {
      const subData = {
        id: existing ? existing.id : DB._subid++,
        assignment_id: aid!, student_id: DEMO_STUDENT.id,
        student_name: DEMO_STUDENT.student_full_name,
        student_enrollment: DEMO_STUDENT.enrollment_number,
        student_div: DEMO_STUDENT.division,
        submitted_at: new Date().toISOString(),
        submission_file: hasFile ? fileName : '',
        submission_text: hasText ? text.trim() : '',
        is_late: overdue, status: overdue ? 'late' : 'submitted',
        obtained_marks: null, teacher_comment: '', graded_by: null,
      };
      if (existing) { Object.assign(existing, subData); }
      else { DB.submissions.push(subData); }
      showToast(isResubmit ? 'Assignment resubmitted successfully!' : 'Assignment submitted successfully!');
      setStuAsnDetail(null); refresh();
    }, 700);
  };

  return (
    <div className="page-animate">
      <BackBtn onClick={() => setStuAsnDetail(null)} label="Back to My Assignments" />
      <div className="grid gap-4 items-start" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div>
          <Card className="mb-3.5">
            <div className="flex justify-between items-start mb-3">
              <div><div className="text-lg font-bold">{a.title}</div><div className="text-xs mt-1" style={{ color: 'hsl(var(--text2))' }}>{a.subject || ''} · {a.teacher_name}</div></div>
              <CountdownTag assignment={a} />
            </div>
            <div className="rounded-md p-3.5 text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>{a.description}</div>
            <div className="flex gap-4 mt-3 text-[11px]" style={{ color: 'hsl(var(--text2))' }}>
              <span>📅 Due: {formatDateTime(a.due_date)}</span>
              {a.total_marks && <span>📊 {a.total_marks} marks</span>}
              <span>📎 {SUB_TYPES.find(s => s[0] === a.submission_type)?.[1]}</span>
            </div>
          </Card>
          {existing && (
            <div className="rounded-lg px-3 py-3 mb-3.5 text-xs" style={{ background: '#fff1e5', border: '1px solid #ffc680' }}>
              <div className="font-bold mb-1" style={{ color: '#bc4c00' }}>⚠ Previous Submission</div>
              <div style={{ color: '#bc4c00' }}>You already submitted on {formatDateTime(existing.submitted_at)}. Submitting again will overwrite.</div>
            </div>
          )}
          {overdue && !a.allow_late ? (
            <div className="rounded-lg px-3 py-3 text-xs font-semibold" style={{ background: '#ffebe9', border: '1px solid #ffc1ba', color: '#cf222e' }}>⛔ Past due date, late submissions not allowed.</div>
          ) : (
            <Card title={`${isResubmit ? 'Resubmit' : 'Submit'} Assignment`}>
              {overdue && <div className="rounded-md px-2 py-2 mb-3 text-[11px] font-semibold" style={{ background: '#fff8c5', border: '1px solid #ffe07c', color: '#9a6700' }}>⚠ Late submission allowed.</div>}
              {(a.submission_type === 'file' || a.submission_type === 'both') && (
                <>
                  <FormSection title="File Attachment" />
                  <Field label={`Upload File ${a.submission_type === 'file' ? '*' : ''}`} error={fileErr}>
                    {!fileName ? (
                      <div className="file-drop" onClick={() => { const name = prompt('Enter filename:', 'my_submission.pdf'); if (name) setFileName(name); }}>
                        <div className="text-[28px] mb-1.5">📎</div>
                        <div className="text-xs" style={{ color: 'hsl(var(--text2))' }}>Click to browse or drag &amp; drop</div>
                        <div className="text-[10px] mt-1" style={{ color: 'hsl(var(--text3))' }}>PDF, DOC, DOCX, XLSX — max 10MB</div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center rounded-md px-3 py-2 text-[11px]" style={{ background: '#f0f6ff', border: '1px solid #addcff', color: '#0969da' }}>
                        <span>{fileName}</span>
                        <button onClick={() => setFileName('')} className="bg-transparent border-none cursor-pointer text-sm" style={{ color: '#cf222e' }}>×</button>
                      </div>
                    )}
                  </Field>
                </>
              )}
              {(a.submission_type === 'text' || a.submission_type === 'both') && (
                <>
                  <FormSection title="Written Response" />
                  <Field label={`Your Answer ${a.submission_type === 'text' ? '*' : ''}`} error={textErr}>
                    <FieldTextarea value={text} onChange={setText} placeholder="Type your answer here..." minHeight="150px" />
                    <div className="text-[10px] text-right mt-0.5" style={{ color: 'hsl(var(--text3))' }}>{text.length} characters</div>
                  </Field>
                </>
              )}
              <Btn onClick={submit} disabled={saving} className="w-full mt-2">{saving ? 'Uploading…' : `📤 ${isResubmit ? 'Resubmit' : 'Submit'} Assignment`}</Btn>
            </Card>
          )}
        </div>
        <Card title="Your Submission Status">
          {existing ? (
            [['Submitted', formatDateTime(existing.submitted_at)], ['Type', existing.is_late ? '⚠ Late' : 'On time'], ['Status', cap(existing.status)], ['File', existing.submission_file || '—'], ['Marks', existing.obtained_marks !== null ? existing.obtained_marks + (a.total_marks ? '/' + a.total_marks : '') : 'Not yet graded'], ['Comment', existing.teacher_comment || 'No comment yet']].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)
          ) : (
            <div className="text-center py-5 text-xs" style={{ color: 'hsl(var(--text3))' }}>
              <div className="text-[30px] mb-2">📭</div>
              You haven't submitted this assignment yet.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function AssignmentModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { showToast, refresh } = useApp();
  const a = id ? DB.assignments.find(x => x.id === id) : null;
  const isEdit = !!a;
  const dueDef = () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 16); };

  const [title, setTitle] = useState(a?.title || '');
  const [desc, setDesc] = useState(a?.description || '');
  const [subject, setSubject] = useState(a?.subject || '');
  const [form, setForm] = useState(a?.form || '');
  const [div, setDiv] = useState(a?.division || '');
  const [due, setDue] = useState(a ? new Date(a.due_date).toISOString().slice(0, 16) : dueDef());
  const [totalMarks, setTotalMarks] = useState(a?.total_marks ? String(a.total_marks) : '');
  const [subType, setSubType] = useState(a?.submission_type || 'file');
  const [state, setState] = useState(a?.state || 'published');
  const [allowLate, setAllowLate] = useState(a?.allow_late || false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const divOptions = form ? (DIVS[form] || []).map(d => ({ value: `${form.replace('Form ', '')}${d}`, label: d })) : [];

  const save = (forcedState?: string) => {
    const errs: Record<string, string> = {};
    if (!title) errs.title = 'Title is required.';
    if (!desc) errs.desc = 'Description is required.';
    if (!form) errs.form = 'Please select a form.';
    if (!due) errs.due = 'Due date is required.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const data: any = {
      title, description: desc, subject: subject || null, form,
      division: div || null, teacher_id: DEMO_TEACHER.id, teacher_name: DEMO_TEACHER.name,
      due_date: new Date(due).toISOString(),
      total_marks: parseInt(totalMarks) || null, submission_type: subType,
      allow_late: allowLate, state: forcedState || state, attachment: null,
    };
    setTimeout(() => {
      if (id) { Object.assign(DB.assignments.find(x => x.id === id)!, data); showToast(`Assignment "${title}" updated`); }
      else { DB.assignments.unshift({ id: DB._aid++, ...data }); showToast(`Assignment "${title}" ${(forcedState || state) === 'published' ? 'published' : 'saved as draft'}`); }
      onClose(); refresh();
    }, 400);
  };

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title={isEdit ? '✏️ Edit Assignment' : '➕ Create New Assignment'} onClose={onClose} />
      <ModalBody>
        <FormSection title="Assignment Details" />
        <Field label="Title" required error={errors.title}><FieldInput value={title} onChange={setTitle} placeholder="e.g. Python Exercise 1" hasError={!!errors.title} /></Field>
        <Field label="Description / Instructions" required error={errors.desc}><FieldTextarea value={desc} onChange={setDesc} placeholder="Describe the assignment..." minHeight="120px" /></Field>
        <FormSection title="Class & Subject" />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Subject"><FieldSelect value={subject} onChange={setSubject} options={[{ value: '', label: '— Optional —' }, ...SUBJECTS.map(s => ({ value: s, label: s }))]} /></Field>
          <Field label="Form" required error={errors.form}>
            <FieldSelect value={form} onChange={v => { setForm(v); setDiv(''); }} hasError={!!errors.form}
              options={[{ value: '', label: '— Select —' }, ...FORMS.map(f => ({ value: f, label: f }))]} />
          </Field>
          <Field label="Division"><FieldSelect value={div} onChange={setDiv} options={[{ value: '', label: 'All Divisions' }, ...divOptions]} /></Field>
        </div>
        <FormSection title="Deadline & Marks" />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Due Date & Time" required error={errors.due}><FieldInput value={due} onChange={setDue} type="datetime-local" hasError={!!errors.due} /></Field>
          <Field label="Total Marks"><FieldInput value={totalMarks} onChange={setTotalMarks} type="number" placeholder="e.g. 50" /></Field>
          <Field label="Submission Type"><FieldSelect value={subType} onChange={setSubType} options={SUB_TYPES.map(([v, l]) => ({ value: v, label: l }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="State"><FieldSelect value={state} onChange={setState} options={[
            { value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'closed', label: 'Closed' },
          ]} /></Field>
          <div className="flex items-center pt-[18px]">
            <label className="flex items-center gap-2 text-[12.5px] cursor-pointer select-none">
              <input type="checkbox" checked={allowLate} onChange={e => setAllowLate(e.target.checked)} className="w-4 h-4 cursor-pointer" style={{ accentColor: '#1f6feb' }} />
              Allow late submissions
            </label>
          </div>
        </div>
      </ModalBody>
      <ModalFoot api={isEdit ? `PATCH /api/assignments/${id}/` : 'POST /api/assignments/'}>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn variant="outline" onClick={() => save('draft')} disabled={saving}>Save as Draft</Btn>
        <Btn onClick={() => save('published')} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Assignment'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
