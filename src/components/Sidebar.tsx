import React from 'react';
import { useApp, type Role, type PageId } from '@/context/AppContext';
import { DB, TEACHERS, DEMO_TEACHER, DEMO_STUDENT, getMyAssignments, getMySubmission, isPastDue } from '@/data/database';

interface NavItem {
  sec?: string;
  id?: PageId;
  ico?: string;
  label?: string;
  badge?: () => number | string;
  badgeNew?: boolean;
}

function navItems(role: Role): NavItem[] {
  if (role === 'student') {
    return [
      { sec: 'Main' },
      { id: 'dashboard', ico: '🏠', label: 'Dashboard' },
      { sec: 'Academic' },
      { id: 'assignments', ico: '📝', label: 'My Assignments', badge: () => {
        const pending = getMyAssignments().filter(a => !getMySubmission(a.id) && !isPastDue(a));
        return pending.length || '';
      }, badgeNew: true },
    ];
  }
  if (role === 'teacher') {
    return [
      { sec: 'Main' },
      { id: 'dashboard', ico: '🏠', label: 'Dashboard' },
      { sec: 'Academic' },
      { id: 'assignments', ico: '📝', label: 'Assignments', badge: () => DB.assignments.filter(a => a.teacher_id === DEMO_TEACHER.id).length, badgeNew: true },
      { id: 'exams', ico: '📋', label: 'Examinations' },
      { id: 'results', ico: '📊', label: 'Exam Results' },
      { id: 'attendance', ico: '✅', label: 'Attendance' },
      { sec: 'Reports' },
      { id: 'hod', ico: '📈', label: 'HOD Analysis' },
    ];
  }
  return [
    { sec: 'Main' },
    { id: 'dashboard', ico: '🏠', label: 'Dashboard' },
    { sec: 'People' },
    { id: 'students', ico: '🎓', label: 'Students', badge: () => DB.students.length },
    { id: 'faculty', ico: '👩‍🏫', label: 'Teachers', badge: () => TEACHERS.length },
    { id: 'parents', ico: '👪', label: 'Parents', badge: () => DB.parents.length },
    { sec: 'Academic' },
    { id: 'assignments', ico: '📝', label: 'Assignments', badge: () => DB.assignments.filter(a => a.state === 'published').length, badgeNew: true },
    { id: 'exams', ico: '📋', label: 'Examinations' },
    { id: 'results', ico: '📊', label: 'Exam Results' },
    { id: 'attendance', ico: '✅', label: 'Attendance' },
    { sec: 'Reports' },
    { id: 'hod', ico: '📈', label: 'HOD Analysis' },
    { sec: 'Config' },
    { id: 'config', ico: '⚙️', label: 'Configuration' },
  ];
}

const roleCfg: Record<Role, { avatar: string; bg: string; name: string; roleName: string; badge: string }> = {
  admin: { avatar: '👑', bg: 'linear-gradient(135deg,#2ea043,#238636)', name: 'Administrator', roleName: 'Django Admin', badge: 'Admin View' },
  teacher: { avatar: '👩‍🏫', bg: 'linear-gradient(135deg,#1f6feb,#0969da)', name: 'Ms. Makoni', roleName: 'Computer Science · IT', badge: 'Teacher View' },
  student: { avatar: '🎓', bg: 'linear-gradient(135deg,#8250df,#6e40c9)', name: DEMO_STUDENT?.student_full_name || 'Student', roleName: 'Form 5 · Active', badge: 'Student View' },
};

export default function Sidebar() {
  const { role, setRole, page, setPage, tick } = useApp();
  const cfg = roleCfg[role];
  const items = navItems(role);

  return (
    <div className="w-[230px] flex-shrink-0 flex flex-col overflow-y-auto" style={{ background: '#0d1117' }}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b" style={{ borderColor: '#21262d' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg,#2ea043,#1f6feb)' }}>🏫</div>
          <div>
            <div className="text-[13px] font-bold" style={{ color: '#e6edf3' }}>LKC School</div>
            <div className="text-[10px] mt-px" style={{ color: '#484f58' }}>Management System</div>
          </div>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="px-3 pt-3 pb-1">
        <div className="text-[9px] font-semibold uppercase tracking-wider mb-1.5 pl-1" style={{ color: '#484f58' }}>Demo Role</div>
        <div className="flex gap-2 rounded-lg p-1.5" style={{ background: '#0d1117' }}>
          {(['admin', 'teacher', 'student'] as Role[]).map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-1.5 px-2 border-none rounded-[5px] text-[11px] font-semibold cursor-pointer font-sans text-center transition-all ${role === r ? '' : ''}`}
              style={{
                background: role === r ? '#21262d' : 'transparent',
                color: role === r ? '#e6edf3' : '#8b949e',
              }}>
              {r === 'admin' ? '👑 Admin' : r === 'teacher' ? '👩‍🏫 Teacher' : '🎓 Student'}
            </button>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2">
        {items.map((item, i) => {
          if (item.sec) return <div key={i} className="px-4 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#484f58' }}>{item.sec}</div>;
          const cnt = item.badge ? item.badge() : '';
          return (
            <div key={i} onClick={() => setPage(item.id!)}
              className="flex items-center gap-2.5 py-2 px-4 cursor-pointer text-[12.5px] select-none transition-all"
              style={{
                borderLeft: `3px solid ${page === item.id ? '#2ea043' : 'transparent'}`,
                background: page === item.id ? '#21262d' : 'transparent',
                color: page === item.id ? '#e6edf3' : '#8b949e',
                fontWeight: page === item.id ? 500 : 400,
              }}
              onMouseEnter={e => { if (page !== item.id) { (e.currentTarget as HTMLElement).style.background = '#161b22'; (e.currentTarget as HTMLElement).style.color = '#c9d1d9'; }}}
              onMouseLeave={e => { if (page !== item.id) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8b949e'; }}}>
              <span className="text-sm w-4 text-center flex-shrink-0">{item.ico}</span>
              {item.label}
              {cnt !== '' && (
                <span className={`ml-auto text-[9px] px-1.5 py-px rounded-[10px] font-mono ${item.badgeNew ? 'text-white' : ''}`}
                  style={{ background: item.badgeNew ? '#2ea043' : '#21262d', color: item.badgeNew ? '#fff' : '#8b949e' }}>
                  {cnt}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid #21262d' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: cfg.bg, color: '#fff' }}>{cfg.avatar}</div>
          <div>
            <div className="text-[11px] font-semibold" style={{ color: '#c9d1d9' }}>{cfg.name}</div>
            <div className="text-[9px]" style={{ color: '#484f58' }}>{cfg.roleName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
