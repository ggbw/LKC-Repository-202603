import React from 'react';
import { useApp, type PageId } from '@/context/AppContext';
import { useAuth, type AppRole } from '@/context/AuthContext';

interface NavItem { sec?: string; id?: PageId; ico?: string; label?: string; }

function navItems(roles: AppRole[]): NavItem[] {
  const isAdmin = roles.includes('admin');
  const isTeacher = roles.includes('teacher');
  const isHOD = roles.includes('hod');
  const isHOY = roles.includes('hoy');
  const isStudent = roles.includes('student');
  const isParent = roles.includes('parent');
  const items: NavItem[] = [];

  if (isAdmin || isHOD || isHOY) {
    items.push({ sec: 'Main' }, { id: 'dashboard', ico: 'fas fa-tachometer-alt', label: 'Dashboard' });
  }

  if (isStudent) {
    items.push({ sec: 'My School' });
    items.push({ id: 'assignments', ico: 'fas fa-tasks', label: 'My Assignments' });
    items.push({ id: 'results', ico: 'fas fa-chart-bar', label: 'My Results' });
    items.push({ id: 'attendance', ico: 'fas fa-calendar-check', label: 'My Attendance' });
  }

  if (isParent && !isAdmin) {
    items.push({ sec: 'My Children' });
    items.push({ id: 'students', ico: 'fas fa-graduation-cap', label: 'My Children' });
    items.push({ id: 'results', ico: 'fas fa-chart-bar', label: 'Exam Results' });
  }

  if (isTeacher) {
    items.push({ sec: 'Academic' });
    items.push({ id: 'assignments', ico: 'fas fa-tasks', label: 'Assignments' });
    items.push({ id: 'attendance', ico: 'fas fa-calendar-check', label: 'Attendance' });
    items.push({ id: 'results', ico: 'fas fa-chart-bar', label: 'Exam Results' });
  }

  if (isHOD) {
    items.push({ sec: 'HOD' });
    items.push({ id: 'hod', ico: 'fas fa-chart-line', label: 'HOD Report' });
    items.push({ id: 'exams', ico: 'fas fa-clipboard-list', label: 'Examinations' });
  }

  if (isHOY) {
    items.push({ sec: 'HOY' });
    items.push({ id: 'hoy', ico: 'fas fa-chart-pie', label: 'HOY Report' });
  }

  if (isAdmin) {
    items.push({ sec: 'People' });
    items.push({ id: 'students', ico: 'fas fa-graduation-cap', label: 'Students' });
    items.push({ id: 'faculty', ico: 'fas fa-chalkboard-teacher', label: 'Teachers' });
    items.push({ id: 'parents', ico: 'fas fa-users', label: 'Parents' });
    items.push({ sec: 'Academic' });
    items.push({ id: 'assignments', ico: 'fas fa-tasks', label: 'Assignments' });
    items.push({ id: 'exams', ico: 'fas fa-clipboard-list', label: 'Examinations' });
    items.push({ id: 'results', ico: 'fas fa-chart-bar', label: 'Exam Results' });
    items.push({ id: 'attendance', ico: 'fas fa-calendar-check', label: 'Attendance' });
    items.push({ sec: 'Reports' });
    items.push({ id: 'hod', ico: 'fas fa-chart-line', label: 'HOD Analysis' });
    items.push({ id: 'hoy', ico: 'fas fa-chart-pie', label: 'HOY Analysis' });
    items.push({ sec: 'Admin' });
    items.push({ id: 'admission', ico: 'fas fa-file-alt', label: 'Admissions' });
    items.push({ id: 'users', ico: 'fas fa-user-cog', label: 'User Management' });
    items.push({ id: 'config', ico: 'fas fa-cogs', label: 'Configuration' });
  }

  items.push({ sec: 'Info' });
  items.push({ id: 'announcements', ico: 'fas fa-bullhorn', label: 'Announcements' });

  return items;
}

const roleBg: Record<string, string> = {
  admin: 'linear-gradient(135deg,#1a3fa0,#153285)',
  teacher: 'linear-gradient(135deg,#1f6feb,#0969da)',
  student: 'linear-gradient(135deg,#8250df,#6e40c9)',
  parent: 'linear-gradient(135deg,#bc4c00,#9a6700)',
  hod: 'linear-gradient(135deg,#1f6feb,#0969da)',
  hoy: 'linear-gradient(135deg,#1f6feb,#0969da)',
};
const roleIcon: Record<string, string> = {
  admin: 'fas fa-crown', teacher: 'fas fa-chalkboard-teacher', student: 'fas fa-graduation-cap',
  parent: 'fas fa-users', hod: 'fas fa-chart-line', hoy: 'fas fa-chart-pie',
};

export default function Sidebar() {
  const { page, setPage } = useApp();
  const { profile, primaryRole, roles, signOut } = useAuth();
  const items = navItems(roles);

  return (
    <div className="w-[230px] flex-shrink-0 flex flex-col overflow-y-auto" style={{ background: '#1a3fa0' }}>
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
        <div className="flex items-center gap-2.5">
          <img src="/images/lkc-logo.jpeg" alt="LKC" className="w-9 h-9 rounded-full" />
          <div>
            <div className="text-[13px] font-bold" style={{ color: '#e6edf3' }}>LKC School</div>
            <div className="text-[10px] mt-px" style={{ color: '#484f58' }}>Management System</div>
          </div>
        </div>
      </div>

      <div className="px-3 pt-2 pb-1">
        <div className="flex flex-wrap gap-1">
          {roles.map(r => (
            <span key={r} className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.15)', color: '#e0e7ff' }}>{r}</span>
          ))}
        </div>
      </div>

      <nav className="flex-1 py-2">
        {items.map((item, i) => {
          if (item.sec) return <div key={i} className="px-4 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.sec}</div>;
          return (
            <div key={i} onClick={() => setPage(item.id!)}
              className="flex items-center gap-2.5 py-2 px-4 cursor-pointer text-[12.5px] select-none transition-all"
              style={{
                borderLeft: `3px solid ${page === item.id ? '#ffffff' : 'transparent'}`,
                background: page === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: page === item.id ? '#ffffff' : 'rgba(255,255,255,0.7)',
                fontWeight: page === item.id ? 600 : 400,
              }}
              onMouseEnter={e => { if (page !== item.id) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}}
              onMouseLeave={e => { if (page !== item.id) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}}>
              <i className={`${item.ico} text-[12px] w-4 text-center flex-shrink-0`} />
              {item.label}
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: roleBg[primaryRole] || roleBg.student, color: '#fff' }}>
            <i className={roleIcon[primaryRole] || 'fas fa-user'} style={{ fontSize: '11px' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold truncate" style={{ color: '#ffffff' }}>{profile?.full_name || 'User'}</div>
            <div className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{profile?.email}</div>
          </div>
        </div>
        <button onClick={signOut} className="w-full text-[10px] font-semibold py-1.5 rounded cursor-pointer border-none"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
          <i className="fas fa-sign-out-alt mr-1" /> Sign Out
        </button>
      </div>
    </div>
  );
}
