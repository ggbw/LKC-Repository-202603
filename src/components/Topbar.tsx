import React from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', students: 'Students', faculty: 'Teachers',
  parents: 'Parents', exams: 'Examinations', results: 'Exam Results',
  attendance: 'Attendance', hod: 'HOD Analysis', config: 'Configuration',
  assignments: 'Assignments', announcements: 'Announcements',
};

const roleBadge: Record<string, { bg: string; color: string; border: string; label: string }> = {
  admin: { bg: '#dafbe1', color: '#1a7f37', border: '#aceebb', label: 'Admin' },
  teacher: { bg: '#ddf4ff', color: '#0969da', border: '#addcff', label: 'Teacher' },
  student: { bg: '#fbefff', color: '#8250df', border: '#d8b4fe', label: 'Student' },
  parent: { bg: '#fff1e5', color: '#bc4c00', border: '#ffc680', label: 'Parent' },
  hod: { bg: '#ddf4ff', color: '#0969da', border: '#addcff', label: 'HOD' },
  hoy: { bg: '#ddf4ff', color: '#0969da', border: '#addcff', label: 'HOY' },
};

export default function Topbar() {
  const { page } = useApp();
  const { primaryRole } = useAuth();
  const badge = roleBadge[primaryRole] || roleBadge.student;

  return (
    <div className="h-[52px] flex items-center px-5 gap-3 flex-shrink-0 border-b" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))' }}>
      <div className="text-xs flex items-center gap-1.5" style={{ color: 'hsl(var(--text2))' }}>
        <span>LKC School</span>
        <span>›</span>
        <span className="font-semibold" style={{ color: 'hsl(var(--text))' }}>{PAGE_TITLES[page] || 'Dashboard'}</span>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[5px]" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
          {badge.label} View
        </span>
        <span className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>2026</span>
      </div>
    </div>
  );
}
