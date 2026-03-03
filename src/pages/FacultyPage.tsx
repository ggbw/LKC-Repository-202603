import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { TEACHERS, DB, cap } from '@/data/database';
import { Badge, Card, InfoRow, SearchBar, BackBtn, CountdownTag } from '@/components/SharedUI';

export default function FacultyPage() {
  const { facDetail, setFacDetail, tick } = useApp();
  const [search, setSearch] = useState('');

  if (facDetail) {
    const t = TEACHERS.find(x => x.id === facDetail);
    if (t) return <TeacherDetail teacher={t} />;
  }

  const filt = TEACHERS.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold">Teachers</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>GET /api/faculty/ · {TEACHERS.length}</div></div>
      </div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search..." />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Code','Name','Department','Subjects','Status'].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filt.map(t => (
                <tr key={t.id} className="hover:bg-[hsl(var(--surface2))] cursor-pointer" style={{ borderBottom: '1px solid #f6f8fa' }} onClick={() => setFacDetail(t.id)}>
                  <td className="py-2.5 px-3.5 font-mono text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{t.code}</td>
                  <td className="py-2.5 px-3.5 font-semibold">{t.name}</td>
                  <td className="py-2.5 px-3.5 text-[11px]">{t.dept}</td>
                  <td className="py-2.5 px-3.5 text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{t.subjects.join(', ')}</td>
                  <td className="py-2.5 px-3.5"><Badge status={t.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TeacherDetail({ teacher: t }: { teacher: typeof TEACHERS[0] }) {
  const { setFacDetail } = useApp();
  return (
    <div className="page-animate">
      <BackBtn onClick={() => setFacDetail(null)} label="Back to Teachers" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center text-[32px] flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>👩‍🏫</div>
        <div>
          <div className="text-xl font-bold">{t.name}</div>
          <div className="flex gap-2 items-center mt-1.5">
            <Badge status={t.state} />
            <span className="font-mono text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{t.code}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title="Details">
          {[['Email', t.email], ['Phone', t.phone], ['Subjects', t.subjects.join(', ')], ['Experience', t.exp + ' years']].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}
        </Card>
        <Card title="Recent Assignments">
          {DB.assignments.filter(a => a.teacher_id === t.id).slice(0, 5).map(a => (
            <div key={a.id} className="py-[7px] text-xs" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <div className="font-semibold">{a.title}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{a.form}{a.division ? ' · ' + a.division : ''} · <CountdownTag assignment={a} /></div>
            </div>
          ))}
          {DB.assignments.filter(a => a.teacher_id === t.id).length === 0 && <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No assignments</div>}
        </Card>
      </div>
    </div>
  );
}
