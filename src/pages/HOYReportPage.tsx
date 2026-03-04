import React, { useState, useMemo } from 'react';
import { useExamResults, useStudents, useSubjects } from '@/hooks/useSupabaseData';
import { Card, FilterSelect, GradeChip } from '@/components/SharedUI';
import { FORMS, GRADES, G, P } from '@/data/database';

interface StudentRow {
  name: string; className: string; subjects: Record<string, number | null>;
  count: number; total: number; average: number; grade: string; position: number;
}

export default function HOYReportPage() {
  const { data: results = [] } = useExamResults();
  const { data: students = [] } = useStudents();
  const { data: subjects = [] } = useSubjects();
  const [form, setForm] = useState('Form 5');
  const [examName, setExamName] = useState('');
  const [tab, setTab] = useState<'all' | 'top20' | 'low'>('all');

  const examNames = useMemo(() => [...new Set(results.map((r: any) => r.exam_name))].sort(), [results]);
  const subjectNames = useMemo(() => subjects.map((s: any) => s.name).sort(), [subjects]);

  // Build student rows with subject marks as columns
  const rows: StudentRow[] = useMemo(() => {
    const formStudents = students.filter((s: any) => s.form === form);
    const formResults = results.filter((r: any) => {
      const student = students.find((s: any) => s.id === r.student_id);
      if (!student || student.form !== form) return false;
      if (examName && r.exam_name !== examName) return false;
      return true;
    });

    // Group results by student
    const byStudent: Record<string, { name: string; className: string; marks: Record<string, number> }> = {};

    formResults.forEach((r: any) => {
      const sid = r.student_id;
      const student = students.find((s: any) => s.id === sid);
      if (!student) return;

      if (!byStudent[sid]) {
        byStudent[sid] = { name: student.full_name, className: form.replace('Form ', ''), marks: {} };
      }

      const subName = r.subjects?.name || 'Unknown';
      const pct = P(Number(r.obtained_marks), Number(r.max_marks));
      byStudent[sid].marks[subName] = pct;
    });

    // Convert to rows with position
    const studentRows = Object.values(byStudent).map(s => {
      const marks = Object.values(s.marks);
      const count = marks.length;
      const total = marks.reduce((a, b) => a + b, 0);
      const average = count > 0 ? Math.round(total / count) : 0;
      return {
        name: s.name,
        className: s.className,
        subjects: subjectNames.reduce((acc, sub) => ({ ...acc, [sub]: s.marks[sub] ?? null }), {} as Record<string, number | null>),
        count,
        total,
        average,
        grade: G(average),
        position: 0,
      };
    });

    // Sort by average descending and assign positions
    studentRows.sort((a, b) => b.average - a.average);
    studentRows.forEach((r, i) => { r.position = i + 1; });

    return studentRows;
  }, [results, students, subjects, form, examName, subjectNames]);

  // Filter based on tab
  const displayRows = useMemo(() => {
    if (tab === 'top20') return rows.slice(0, 20);
    if (tab === 'low') return rows.filter(r => r.average < 50);
    return rows;
  }, [rows, tab]);

  // Subject averages and counts
  const subjectStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    rows.forEach(r => {
      Object.entries(r.subjects).forEach(([sub, mark]) => {
        if (mark !== null) {
          if (!stats[sub]) stats[sub] = { count: 0, total: 0 };
          stats[sub].count++;
          stats[sub].total += mark;
        }
      });
    });
    return stats;
  }, [rows]);

  // Grade distribution
  const gradeDist = useMemo(() => {
    const dist: Record<string, number> = {};
    GRADES.forEach(g => { dist[g] = 0; });
    rows.forEach(r => { dist[r.grade] = (dist[r.grade] || 0) + 1; });
    return dist;
  }, [rows]);

  // Credit pass %
  const creditPass = rows.length ? Math.round(rows.filter(r => r.average >= 60).length / rows.length * 100 * 100) / 100 : 0;

  // Subjects with data
  const activeSubjects = subjectNames.filter(s => subjectStats[s]?.count > 0);

  const tabs = [['all', `All Students (${rows.length})`], ['top20', 'Top 20 Achievers'], ['low', 'Low Achievers']];

  return (
    <div className="page-animate">
      <div className="mb-4">
        <div className="text-lg font-bold">HOY Grades Analysis</div>
        <div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>End of Term Analysis · {form}</div>
      </div>

      <Card title="Filters" className="mb-3.5">
        <div className="flex gap-3 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold mb-1" style={{ color: 'hsl(var(--text2))' }}>Form</div>
            <FilterSelect value={form} onChange={setForm} allLabel="" options={FORMS.map(f => ({ value: f, label: f }))} />
          </div>
          <div>
            <div className="text-[11px] font-semibold mb-1" style={{ color: 'hsl(var(--text2))' }}>Exam</div>
            <FilterSelect value={examName} onChange={setExamName} allLabel="All Exams" options={examNames.map((e: string) => ({ value: e, label: e }))} />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex mb-3" style={{ borderBottom: '2px solid hsl(var(--border))' }}>
        {tabs.map(([id, label]) => (
          <div key={id} onClick={() => setTab(id as any)}
            className="py-2 px-4 text-[12px] font-semibold cursor-pointer"
            style={{
              borderBottom: tab === id ? '2px solid #1f6feb' : '2px solid transparent',
              color: tab === id ? '#1f6feb' : 'hsl(var(--text2))',
              marginBottom: '-2px',
            }}>
            {label}
          </div>
        ))}
      </div>

      {displayRows.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-xs" style={{ color: 'hsl(var(--text3))' }}>
            No exam results found for {form}. Enter exam results first.
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="text-center font-bold text-[13px] py-2.5 px-4" style={{ background: '#0d1117', color: '#e6edf3' }}>
            {tab === 'top20' ? `Top 20 Achievers — ${form}` : tab === 'low' ? `Low Achievers — ${form}` : `${form} — ${examName || 'All Exams'} — Consolidated Analysis`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: '10.5px' }}>
              <thead>
                <tr style={{ background: '#f6f8fa', borderBottom: '2px solid hsl(var(--border))' }}>
                  <th className="py-2 px-2 text-center text-[9px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Sr.</th>
                  <th className="py-2 px-2 text-left text-[9px] font-semibold uppercase whitespace-nowrap" style={{ color: 'hsl(var(--text2))', minWidth: '160px' }}>Name & Surname</th>
                  <th className="py-2 px-2 text-center text-[9px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Class</th>
                  {activeSubjects.map(s => (
                    <th key={s} className="py-2 px-1 text-center text-[8px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))', writingMode: 'vertical-lr', height: '80px', maxWidth: '24px' }}>{s}</th>
                  ))}
                  <th className="py-2 px-2 text-center text-[9px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Count</th>
                  <th className="py-2 px-2 text-center text-[9px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Total</th>
                  <th className="py-2 px-2 text-center text-[9px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Avg</th>
                  <th className="py-2 px-2 text-center text-[9px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Grade</th>
                  <th className="py-2 px-2 text-center text-[9px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Pos</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f2f5', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td className="py-1.5 px-2 text-center font-mono">{r.position}</td>
                    <td className="py-1.5 px-2 font-semibold whitespace-nowrap">{r.name}</td>
                    <td className="py-1.5 px-2 text-center font-mono">{r.className}</td>
                    {activeSubjects.map(s => {
                      const mark = r.subjects[s];
                      const color = mark === null ? '#e0e0e0' : mark >= 60 ? '#1a7f37' : mark >= 50 ? '#9a6700' : '#cf222e';
                      return (
                        <td key={s} className="py-1.5 px-1 text-center font-mono font-bold" style={{ color: mark === null ? '#e0e0e0' : color }}>
                          {mark !== null ? mark : ''}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-2 text-center font-mono">{r.count}</td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold">{r.total}</td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold">{r.average}</td>
                    <td className="py-1.5 px-2 text-center"><GradeChip grade={r.grade} /></td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold">{r.position}</td>
                  </tr>
                ))}
                {/* Summary rows */}
                <tr style={{ background: '#f0f6ff', borderTop: '2px solid hsl(var(--border))' }}>
                  <td colSpan={3} className="py-2 px-2 font-bold text-[10px]">No. of Students</td>
                  {activeSubjects.map(s => (
                    <td key={s} className="py-2 px-1 text-center font-mono font-bold">{subjectStats[s]?.count || 0}</td>
                  ))}
                  <td colSpan={5} />
                </tr>
                <tr style={{ background: '#f0f6ff' }}>
                  <td colSpan={3} className="py-2 px-2 font-bold text-[10px]">% Subject Average</td>
                  {activeSubjects.map(s => {
                    const st = subjectStats[s];
                    const avg = st && st.count > 0 ? Math.round(st.total / st.count) : 0;
                    return <td key={s} className="py-2 px-1 text-center font-mono font-bold">{avg || ''}</td>;
                  })}
                  <td colSpan={5} />
                </tr>
                <tr style={{ background: '#f0fff4' }}>
                  <td colSpan={3} className="py-2 px-2 font-bold text-[10px]" style={{ color: '#1a7f37' }}>CREDIT PASS</td>
                  <td colSpan={activeSubjects.length} className="py-2 px-2 text-center font-bold" style={{ color: '#1a7f37' }}>{creditPass}%</td>
                  <td colSpan={5} />
                </tr>
              </tbody>
            </table>
          </div>
          {/* Grade distribution summary */}
          <div className="px-4 py-3" style={{ background: '#f6f8fa', borderTop: '1px solid hsl(var(--border))' }}>
            <div className="text-[10px] font-bold mb-2" style={{ color: 'hsl(var(--text2))' }}>Grade Distribution</div>
            <div className="flex gap-3">
              {GRADES.map(g => (
                <div key={g} className="text-center">
                  <div className="text-[10px] font-bold" style={{ color: 'hsl(var(--text2))' }}>{g}</div>
                  <div className="text-[13px] font-bold font-mono">{gradeDist[g]}</div>
                </div>
              ))}
              <div className="text-center ml-4">
                <div className="text-[10px] font-bold" style={{ color: 'hsl(var(--text2))' }}>Total</div>
                <div className="text-[13px] font-bold font-mono">{rows.length}</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
