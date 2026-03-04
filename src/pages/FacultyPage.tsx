import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useTeachers, useSubjectTeachers } from '@/hooks/useSupabaseData';
import { cap } from '@/data/database';
import { Badge, Card, InfoRow, SearchBar, BackBtn } from '@/components/SharedUI';

export default function FacultyPage() {
  const { detail, setDetail } = useApp();
  const { data: teachers = [], isLoading } = useTeachers();
  const { data: subjectTeachers = [] } = useSubjectTeachers();
  const [search, setSearch] = useState('');

  if (detail) {
    const t = teachers.find((x: any) => x.id === detail) as any;
    if (t) {
      const subjects = subjectTeachers.filter((st: any) => st.teacher_id === t.id).map((st: any) => st.subjects?.name).filter(Boolean);
      return (
        <div className="page-animate">
          <BackBtn onClick={() => setDetail(null)} label="Back to Teachers" />
          <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center text-[32px] flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>👩‍🏫</div>
            <div>
              <div className="text-xl font-bold">{t.name}</div>
              <div className="flex gap-2 items-center mt-1.5"><Badge status={t.state || 'active'} /><span className="font-mono text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{t.code}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card title="Details">
              {[['Email', t.email || '—'], ['Phone', t.phone || '—'], ['Department', t.department || '—'], ['Code', t.code || '—'], ['Joining Date', t.joining_date || '—']].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}
            </Card>
            <Card title={`Subjects (${subjects.length})`}>
              {subjects.length ? subjects.map((s: string) => (
                <div key={s} className="py-1.5 text-xs" style={{ borderBottom: '1px solid #f6f8fa' }}>{s}</div>
              )) : <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No subjects assigned</div>}
            </Card>
          </div>
        </div>
      );
    }
  }

  const filt = teachers.filter((t: any) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.code || '').toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  return (
    <div className="page-animate">
      <div className="mb-4"><div className="text-lg font-bold">Teachers</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{teachers.length} total</div></div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search..." />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Code','Name','Department','Email','Status'].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filt.map((t: any) => (
                <tr key={t.id} className="hover:bg-[hsl(var(--surface2))] cursor-pointer" style={{ borderBottom: '1px solid #f6f8fa' }} onClick={() => setDetail(t.id)}>
                  <td className="py-2.5 px-3.5 font-mono text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{t.code}</td>
                  <td className="py-2.5 px-3.5 font-semibold">{t.name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{t.department}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{t.email || '—'}</td>
                  <td className="py-2.5 px-3.5"><Badge status={t.state || 'active'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
