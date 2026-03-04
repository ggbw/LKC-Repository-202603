import React, { useState } from 'react';
import { useExamResults, useInvalidate } from '@/hooks/useSupabaseData';
import { useApp } from '@/context/AppContext';
import { G, P } from '@/data/database';
import { Badge, Card, SearchBar, FilterSelect, GradeChip } from '@/components/SharedUI';

export default function ResultsPage() {
  const { data: results = [], isLoading } = useExamResults();
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('');

  const exams = [...new Set(results.map((r: any) => r.exam_name))];
  const filt = results.filter((r: any) =>
    (!search || (r.students?.full_name || '').toLowerCase().includes(search.toLowerCase())) &&
    (!examFilter || r.exam_name === examFilter)
  );

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  return (
    <div className="page-animate">
      <div className="mb-4"><div className="text-lg font-bold">Exam Results</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{results.length} total results</div></div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search student...">
          <FilterSelect value={examFilter} onChange={setExamFilter} allLabel="All Exams" options={exams.map(e => ({ value: e, label: e }))} />
        </SearchBar>
        {filt.length === 0 ? (
          <div className="py-10 text-center text-xs" style={{ color: 'hsl(var(--text3))' }}>No results found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                {['Student','Subject','Exam','Marks','%','Grade','Status'].map(h => (
                  <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filt.slice(0, 100).map((r: any) => {
                  const p = P(Number(r.obtained_marks), Number(r.max_marks));
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f6f8fa' }}>
                      <td className="py-2.5 px-3.5 font-semibold">{r.students?.full_name || '—'}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{r.subjects?.name || '—'}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{r.exam_name}</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px]">{r.obtained_marks}/{r.max_marks}</td>
                      <td className="py-2.5 px-3.5 font-mono font-bold">{p}%</td>
                      <td className="py-2.5 px-3.5"><GradeChip grade={G(p)} /></td>
                      <td className="py-2.5 px-3.5"><Badge status={r.state || 'done'} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-[11px] mt-2.5" style={{ color: 'hsl(var(--text2))' }}>{filt.length} results</div>
          </div>
        )}
      </Card>
    </div>
  );
}
