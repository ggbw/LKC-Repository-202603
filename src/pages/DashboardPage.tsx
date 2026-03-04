import React from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useStudents, useTeachers, useAttendance, useAnnouncements } from '@/hooks/useSupabaseData';
import { StatCard, Card, Badge, Btn } from '@/components/SharedUI';
import { FORMS, formatDate } from '@/data/database';

export default function DashboardPage() {
  const { isStudent, isParent, isTeacher, isAdmin, isHOD, isHOY, profile } = useAuth();
  const { setPage } = useApp();
  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: todayAtt = [] } = useAttendance(todayStr);
  const { data: announcements = [] } = useAnnouncements();

  const active = students.filter(s => s.state === 'active').length;
  const rate = todayAtt.length ? Math.round(todayAtt.filter((a: any) => a.status === 'present').length / todayAtt.length * 100) : 0;
  const fCnts = FORMS.map(f => ({ f, n: students.filter(s => s.form === f && s.state === 'active').length }));
  const mx = Math.max(...fCnts.map(x => x.n), 1);

  return (
    <div className="page-animate">
      <div className="mb-4">
        <div className="text-lg font-bold">Welcome, {profile?.full_name || 'User'}! 👋</div>
        <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
        <StatCard icon="🎓" bg="#dafbe1" value={students.length} label="Total Students" sub={`Active: ${active}`} subColor="#2ea043" />
        <StatCard icon="👩‍🏫" bg="#ddf4ff" value={teachers.length} label="Teachers" />
        <StatCard icon="✅" bg="#fff8c5" value={`${rate}%`} label="Attendance Today" />
        <StatCard icon="📢" bg="#fbefff" value={announcements.length} label="Announcements" />
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <Card title="📢 Recent Announcements" titleRight={<Btn variant="outline" size="sm" onClick={() => setPage('announcements')} style={{ fontSize: '10px' }}>View All</Btn>}>
          {announcements.slice(0, 5).map((a: any) => (
            <div key={a.id} className="py-2.5" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <div className="flex justify-between items-start">
                <div className="font-semibold text-[12.5px]">{a.title}</div>
                <Badge status={a.type || 'announcement'} />
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'hsl(var(--text2))' }}>{a.content?.slice(0, 100)}</div>
              <div className="text-[10px] mt-1" style={{ color: 'hsl(var(--text3))' }}>{formatDate(a.created_at)}</div>
            </div>
          ))}
          {announcements.length === 0 && <div className="text-xs py-2" style={{ color: 'hsl(var(--text3))' }}>No announcements yet</div>}
        </Card>

        <Card title="🏫 Students by Form">
          {fCnts.map(({ f, n }) => (
            <div key={f} className="mb-2.5">
              <div className="flex justify-between text-[11px] mb-1" style={{ color: 'hsl(var(--text2))' }}>
                <span>{f}</span><span className="font-mono">{n}</span>
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
