import React from 'react';
import { useApp } from '@/context/AppContext';
import { DB, TEACHERS, DEMO_TEACHER, DEMO_STUDENT, FORMS, getMyAssignments, getMySubmission, isPastDue, formatDate } from '@/data/database';
import { StatCard, Card, CountdownTag, Badge, Btn } from '@/components/SharedUI';

export default function DashboardPage() {
  const { role, setPage, tick } = useApp();
  if (role === 'student') return <StudentDash />;
  if (role === 'teacher') return <TeacherDash />;
  return <AdminDash />;
}

function AdminDash() {
  const { setPage } = useApp();
  const active = DB.students.filter(s => s.state === 'active').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const tAtt = DB.attendance.filter(a => a.date === todayStr);
  const rate = tAtt.length ? Math.round(tAtt.filter(a => a.state === 'present').length / tAtt.length * 100) : 0;
  const pubAsgnCount = DB.assignments.filter(a => a.state === 'published').length;
  const fCnts = FORMS.map(f => ({ f, n: DB.students.filter(s => s.form === f && s.state === 'active').length }));
  const mx = Math.max(...fCnts.map(x => x.n), 1);

  return (
    <div className="page-animate">
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
        <StatCard icon="🎓" bg="#dafbe1" value={DB.students.length} label="Total Students" sub={`Active: ${active}`} subColor="#2ea043" />
        <StatCard icon="👩‍🏫" bg="#ddf4ff" value={TEACHERS.length} label="Teachers" sub={`On leave: ${TEACHERS.filter(t => t.state === 'on_leave').length}`} subColor="#1f6feb" />
        <StatCard icon="📝" bg="#fff1e5" value={pubAsgnCount} label="Active Assignments" sub={`${DB.submissions.length} submissions`} subColor="#bc4c00" />
        <StatCard icon="✅" bg="#fff8c5" value={`${rate}%`} label="Attendance Today" />
        <StatCard icon="📊" bg="#ffebe9" value={DB.results.length} label="Exam Results" />
      </div>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <Card title="📝 Recent Assignments" titleRight={<Btn variant="outline" size="sm" onClick={() => setPage('assignments')} style={{ fontSize: '10px' }}>View All</Btn>}>
          {DB.assignments.slice(0, 5).map(a => (
            <div key={a.id} className="flex items-center gap-3 py-[9px] cursor-pointer" style={{ borderBottom: '1px solid #f6f8fa' }} onClick={() => setPage('assignments')}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: '#fff1e5' }}>📝</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[12.5px]">{a.title}</div>
                <div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{a.subject} · {a.form}{a.division ? ' · ' + a.division : ''}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <CountdownTag assignment={a} />
                <div className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{DB.submissions.filter(s => s.assignment_id === a.id).length} submitted</div>
              </div>
            </div>
          ))}
        </Card>
        <Card title="🏫 Students by Form">
          {fCnts.map(({ f, n }) => (
            <div key={f} className="mb-2.5">
              <div className="flex justify-between text-[11px] mb-1" style={{ color: 'hsl(var(--text2))' }}>
                <span>{f}</span>
                <span className="font-mono">{n}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${n / mx * 100}%` }} />
              </div>
            </div>
          ))}
          <div className="mt-2.5 rounded-md px-3 py-[9px] text-[11px] font-semibold" style={{ background: '#f0fff4', border: '1px solid #aceebb', color: '#1a7f37' }}>
            📅 Academic Year 2026 — Active
          </div>
        </Card>
      </div>
    </div>
  );
}

function TeacherDash() {
  const { setPage } = useApp();
  const myA = DB.assignments.filter(a => a.teacher_id === DEMO_TEACHER.id);
  const mySubs = DB.submissions.filter(s => myA.some(a => a.id === s.assignment_id));
  const pending = mySubs.filter(s => s.status !== 'graded').length;

  return (
    <div className="page-animate">
      <div className="mb-4">
        <div className="text-lg font-bold">Good morning, {DEMO_TEACHER.name}! 👋</div>
        <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--text2))' }}>Computer Science &amp; ICT · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
        <StatCard icon="📝" bg="#ddf4ff" value={myA.length} label="My Assignments" sub={`${myA.filter(a => a.state === 'published').length} active`} subColor="#1f6feb" />
        <StatCard icon="📬" bg="#dafbe1" value={mySubs.length} label="Submissions" sub={`${mySubs.filter(s => s.status === 'graded').length} graded`} subColor="#2ea043" />
        <StatCard icon="⏳" bg="#fff8c5" value={pending} label="Pending Grading" sub="Needs review" subColor="#e3b341" />
      </div>
      <Card title="My Assignments" titleRight={<Btn variant="primary" size="sm" onClick={() => setPage('assignments')} style={{ fontSize: '10px' }}>Manage All</Btn>}>
        {myA.length === 0 && <div className="text-xs py-2.5" style={{ color: 'hsl(var(--text3))' }}>No assignments yet. <span className="cursor-pointer" style={{ color: '#1f6feb' }} onClick={() => setPage('assignments')}>Create one →</span></div>}
        {myA.map(a => {
          const subs = DB.submissions.filter(s => s.assignment_id === a.id);
          const graded = subs.filter(s => s.status === 'graded').length;
          return (
            <div key={a.id} className="flex items-center gap-3 py-2.5 cursor-pointer" style={{ borderBottom: '1px solid #f6f8fa' }} onClick={() => setPage('assignments')}>
              <div className="flex-1">
                <div className="font-semibold text-[13px]">{a.title}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{a.subject} · {a.form}{a.division ? ' · ' + a.division : ''}</div>
              </div>
              <div className="flex gap-2 items-center flex-shrink-0">
                <CountdownTag assignment={a} />
                <div className="text-right">
                  <div className="text-[11px] font-semibold">{subs.length} submitted</div>
                  <div className="text-[10px]" style={{ color: 'hsl(var(--text2))' }}>{graded} graded</div>
                </div>
                <Badge status={a.state} />
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function StudentDash() {
  const { setPage } = useApp();
  const myA = getMyAssignments();
  const pendingA = myA.filter(a => !getMySubmission(a.id) && !isPastDue(a));
  const overdue = myA.filter(a => !getMySubmission(a.id) && isPastDue(a) && !a.allow_late);

  return (
    <div className="page-animate">
      <div className="mb-4">
        <div className="text-lg font-bold">Welcome back, {DEMO_STUDENT?.student_full_name || 'Student'}! 👋</div>
        <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{DEMO_STUDENT?.form} · {DEMO_STUDENT?.division} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
        <StatCard icon="📝" bg="#ddf4ff" value={myA.length} label="Assignments" sub="For my class" subColor="#1f6feb" />
        <StatCard icon="✅" bg="#dafbe1" value={DB.submissions.filter(s => s.student_id === DEMO_STUDENT?.id).length} label="Submitted" />
        <StatCard icon="⏳" bg="#fff8c5" value={pendingA.length} label="Pending" sub="Not yet submitted" subColor="#e3b341" />
        {overdue.length > 0 && (
          <div className="flex items-center gap-3.5 p-4 rounded-lg" style={{ background: 'hsl(var(--surface))', border: '1px solid #ffc1ba', boxShadow: 'var(--shadow)' }}>
            <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#ffebe9' }}>⚠️</div>
            <div>
              <div className="text-2xl font-bold leading-none font-mono" style={{ color: '#f85149' }}>{overdue.length}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text2))' }}>Overdue</div>
              <div className="text-[10px] mt-0.5 font-medium" style={{ color: '#f85149' }}>Missed deadline</div>
            </div>
          </div>
        )}
      </div>
      {overdue.length > 0 && (
        <div className="rounded-lg px-4 py-3 mb-3.5 text-xs font-semibold" style={{ background: '#ffebe9', border: '1px solid #ffc1ba', color: '#cf222e' }}>
          ⚠️ You have {overdue.length} overdue assignment{overdue.length > 1 ? 's' : ''}: {overdue.map(a => a.title).join(', ')}
        </div>
      )}
      <Card title="📋 Upcoming Assignments">
        {myA.filter(a => !isPastDue(a)).slice(0, 4).map(a => {
          const sub = getMySubmission(a.id);
          return (
            <div key={a.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <div className="flex-1">
                <div className="font-semibold text-[13px]">{a.title}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{a.subject} · {a.teacher_name} · {a.total_marks ? a.total_marks + ' marks' : ''}</div>
              </div>
              <div className="flex gap-2 items-center flex-shrink-0">
                <CountdownTag assignment={a} />
                {sub ? <Badge status={sub.status} /> : <Btn variant="blue" size="sm" onClick={() => setPage('assignments')}>Submit</Btn>}
              </div>
            </div>
          );
        })}
        {myA.filter(a => !isPastDue(a)).length === 0 && <div className="text-xs py-2" style={{ color: 'hsl(var(--text3))' }}>No upcoming assignments.</div>}
        <div className="mt-3">
          <Btn variant="outline" size="sm" onClick={() => setPage('assignments')}>📝 View All Assignments</Btn>
        </div>
      </Card>
    </div>
  );
}
