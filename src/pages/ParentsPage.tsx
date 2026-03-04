import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useParents, useParentStudents } from '@/hooks/useSupabaseData';
import { cap } from '@/data/database';
import { Badge, Card, InfoRow, SearchBar, BackBtn, Btn } from '@/components/SharedUI';

export default function ParentsPage() {
  const { detail, setDetail, setPage } = useApp();
  const { data: parents = [], isLoading } = useParents();
  const { data: parentStudents = [] } = useParentStudents();
  const [search, setSearch] = useState('');

  if (detail) {
    const p = parents.find((x: any) => x.id === detail) as any;
    if (p) {
      const children = parentStudents.filter((ps: any) => ps.parent_id === p.id).map((ps: any) => ps.students).filter(Boolean);
      return (
        <div className="page-animate">
          <BackBtn onClick={() => setDetail(null)} label="Back to Parents" />
          <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center text-[32px] flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>👪</div>
            <div>
              <div className="text-xl font-bold">{p.name}</div>
              <div className="text-xs mt-1" style={{ color: 'hsl(var(--text2))' }}>{cap(p.relation || '')}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card title="Contact">
              {[['Phone', p.phone || '—'], ['Email', p.email || '—'], ['Relation', cap(p.relation || '')]].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}
            </Card>
            <Card title={`Children (${children.length})`}>
              {children.length ? children.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center py-2 text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
                  <div>
                    <div className="font-semibold cursor-pointer" style={{ color: '#1f6feb' }} onClick={() => { setPage('students'); setDetail(s.id); }}>{s.full_name}</div>
                    <div className="text-[10px]" style={{ color: 'hsl(var(--text2))' }}>{s.form}</div>
                  </div>
                  <Badge status={s.state || 'active'} />
                </div>
              )) : <div className="text-xs py-2.5" style={{ color: 'hsl(var(--text3))' }}>No students linked.</div>}
            </Card>
          </div>
        </div>
      );
    }
  }

  const rows = parents.filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  return (
    <div className="page-animate">
      <div className="mb-4"><div className="text-lg font-bold">Parents</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{parents.length} total</div></div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search..." />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Name','Relation','Phone','Email','Children'].map(h => (
                <th key={h} className={`py-[9px] px-3.5 text-[10px] font-semibold uppercase tracking-wide ${h === 'Children' ? 'text-center' : 'text-left'}`} style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((p: any) => {
                const cnt = parentStudents.filter((ps: any) => ps.parent_id === p.id).length;
                return (
                  <tr key={p.id} className="hover:bg-[hsl(var(--surface2))] cursor-pointer" style={{ borderBottom: '1px solid #f6f8fa' }} onClick={() => setDetail(p.id)}>
                    <td className="py-2.5 px-3.5 font-semibold" style={{ color: '#1f6feb' }}>{p.name}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{cap(p.relation || '')}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{p.phone || '—'}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{p.email || '—'}</td>
                    <td className="py-2.5 px-3.5 text-center font-bold font-mono">{cnt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
