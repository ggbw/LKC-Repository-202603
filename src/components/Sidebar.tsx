import React from 'react';
import { useApp, type PageId } from '@/context/AppContext';
import { useAuth, type AppRole } from '@/context/AuthContext';

interface NavItem {
  sec?: string;
  id?: PageId;
  ico?: string;
  label?: string;
}

function navItems(primaryRole: AppRole, roles: AppRole[]): NavItem[] {
  const isAdmin = roles.includes('admin');
  const isTeacher = roles.includes('teacher');
  const isHOD = roles.includes('hod');
  const isHOY = roles.includes('hoy');
  const isStudent = roles.includes('student');
  const isParent = roles.includes('parent');

  const items: NavItem[] = [];

  // Dashboard - Admin, HOD, HOY only
  if (isAdmin || isHOD || isHOY) {
    items.push({ sec: 'Main' }, { id: 'dashboard', ico: '🏠', label: 'Dashboard' });
  }

  // Student view
  if (isStudent) {
    items.push({ sec: 'My School' });
    items.push({ id: 'assignments', ico: '📝', label: 'My Assignments' });
    items.push({ id: 'results', ico: '📊', label: 'My Results' });
    items.push({ id: 'attendance', ico: '✅', label: 'My Attendance' });
  }

  // Parent view
  if (isParent && !isAdmin) {
    items.push({ sec: 'My Children' });
    items.push({ id: 'students', ico: '🎓', label: 'My Children' });
    items.push({ id: 'results', ico: '📊', label: 'Exam Results' });
  }

  // Teacher view
  if (isTeacher) {
    items.push({ sec: 'Academic' });
    items.push({ id: 'assignments', ico: '📝', label: 'Assignments' });
    items.push({ id: 'attendance', ico: '✅', label: 'Attendance' });
    items.push({ id: 'results', ico: '📊', label: 'Exam Results' });
  }

  // HOD extras
  if (isHOD) {
    items.push({ sec: 'HOD' });
    items.push({ id: 'hod', ico: '📈', label: 'Department Reports' });
    items.push({ id: 'exams', ico: '📋', label: 'Examinations' });
  }

  // HOY extras
  if (isHOY) {
    items.push({ sec: 'HOY' });
    items.push({ id: 'hod', ico: '📈', label: 'Year Reports' });
  }

  // Admin full access
  if (isAdmin) {
    items.push({ sec: 'People' });
    items.push({ id: 'students', ico: '🎓', label: 'Students' });
    items.push({ id: 'faculty', ico: '👩‍🏫', label: 'Teachers' });
    items.push({ id: 'parents', ico: '👪', label: 'Parents' });
    items.push({ sec: 'Academic' });
    items.push({ id: 'assignments', ico: '📝', label: 'Assignments' });
    items.push({ id: 'exams', ico: '📋', label: 'Examinations' });
    items.push({ id: 'results', ico: '📊', label: 'Exam Results' });
    items.push({ id: 'attendance', ico: '✅', label: 'Attendance' });
    items.push({ sec: 'Reports' });
    items.push({ id: 'hod', ico: '📈', label: 'HOD Analysis' });
    items.push({ sec: 'Config' });
    items.push({ id: 'config', ico: '⚙️', label: 'Configuration' });
  }

  // Everyone sees announcements
  items.push({ sec: 'Info' });
  items.push({ id: 'announcements' as PageId, ico: '📢', label: 'Announcements' });

  return items;
}

const roleBg: Record<string, string> = {
  admin: 'linear-gradient(135deg,#2ea043,#238636)',
  teacher: 'linear-gradient(135deg,#1f6feb,#0969da)',
  student: 'linear-gradient(135deg,#8250df,#6e40c9)',
  parent: 'linear-gradient(135deg,#bc4c00,#9a6700)',
  hod: 'linear-gradient(135deg,#1f6feb,#0969da)',
  hoy: 'linear-gradient(135deg,#1f6feb,#0969da)',
};

const roleIcon: Record<string, string> = {
  admin: '👑', teacher: '👩‍🏫', student: '🎓', parent: '👪', hod: '📈', hoy: '📊',
};

export default function Sidebar() {
  const { page, setPage } = useApp();
  const { profile, primaryRole, roles, signOut } = useAuth();
  const items = navItems(primaryRole, roles);

  return (
    <div className="w-[230px] flex-shrink-0 flex flex-col overflow-y-auto" style={{ background: '#0d1117' }}>
      {/* Logo */}
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: '#21262d' }}>
        <div className="flex items-center gap-2.5">
          <img src="/images/lkc-logo.jpeg" alt="LKC" className="w-9 h-9 rounded-full" />
          <div>
            <div className="text-[13px] font-bold" style={{ color: '#e6edf3' }}>LKC School</div>
            <div className="text-[10px] mt-px" style={{ color: '#484f58' }}>Management System</div>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex flex-wrap gap-1">
          {roles.map(r => (
            <span key={r} className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded" style={{ background: '#21262d', color: '#8b949e' }}>
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2">
        {items.map((item, i) => {
          if (item.sec) return <div key={i} className="px-4 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#484f58' }}>{item.sec}</div>;
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
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid #21262d' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: roleBg[primaryRole] || roleBg.student, color: '#fff' }}>
            {roleIcon[primaryRole] || '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold truncate" style={{ color: '#c9d1d9' }}>{profile?.full_name || 'User'}</div>
            <div className="text-[9px] truncate" style={{ color: '#484f58' }}>{profile?.email}</div>
          </div>
        </div>
        <button onClick={signOut}
          className="w-full text-[10px] font-semibold py-1.5 rounded cursor-pointer border-none"
          style={{ background: '#21262d', color: '#8b949e' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
