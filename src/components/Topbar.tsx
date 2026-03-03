import React from 'react';
import { useApp } from '@/context/AppContext';
import { DEMO_STUDENT } from '@/data/database';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', students: 'Students', faculty: 'Teachers',
  parents: 'Parents', exams: 'Examinations', results: 'Exam Results',
  attendance: 'Attendance', hod: 'HOD Analysis', config: 'Configuration',
  assignments: 'Assignments',
};

const roleCfg = {
  admin: { avatar: '👑', bg: 'linear-gradient(135deg,#2ea043,#238636)', badge: 'Admin View' },
  teacher: { avatar: '👩‍🏫', bg: 'linear-gradient(135deg,#1f6feb,#0969da)', badge: 'Teacher View' },
  student: { avatar: '🎓', bg: 'linear-gradient(135deg,#8250df,#6e40c9)', badge: 'Student View' },
};

export default function Topbar() {
  const { role, page } = useApp();
  const cfg = roleCfg[role];

  return (
    <div className="h-[52px] flex items-center px-5 gap-3 flex-shrink-0 border-b" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))' }}>
      <div className="text-xs flex items-center gap-1.5" style={{ color: 'hsl(var(--text2))' }}>
        <span>LKC School</span>
        <span>›</span>
        <span className="font-semibold" style={{ color: 'hsl(var(--text))' }}>{PAGE_TITLES[page] || 'Dashboard'}</span>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[5px]" style={{ background: '#dafbe1', color: '#1a7f37', border: '1px solid #aceebb' }}>
          {cfg.badge} · REST API
        </span>
        <span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>2026 · Gaborone</span>
        <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: cfg.bg }}>{cfg.avatar}</div>
      </div>
    </div>
  );
}
