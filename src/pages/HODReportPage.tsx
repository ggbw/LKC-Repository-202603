import React, { useState, useMemo } from 'react';
import { useExamResults, useTeachers, useSubjects, useSubjectTeachers } from '@/hooks/useSupabaseData';
import { Card, Btn, FilterSelect } from '@/components/SharedUI';
import { FORMS, GRADES, G, P } from '@/data/database';

export default function HODReportPage() {
  const { data: results = [] } = useExamResults();
  const { data: teachers = [] } = useTeachers();
  const { data: subjects = [] } = useSubjects();
  const { data: subjectTeachers = [] } = useSubjectTeachers();

  // Get unique departments
  const departments = useMemo(() => [...new Set(teachers.map((t: any) => t.department).filter(Boolean))].sort(), [teachers]);
  const examNames = useMemo(() => [...new Set(results.map((r: any) => r.exam_name))].sort(), [results]);

  const [dept, setDept] = useState('');
  const [examName, setExamName] = useState('');

  // Get teachers in selected department
  const deptTeachers = useMemo(() => {
    if (!dept) return teachers;
    return teachers.filter((t: any) => t.department === dept);
  }, [dept, teachers]);

  // Build grade analysis data: grouped by form, then by teacher
  const analysis = useMemo(() => {
    const filtered = results.filter((r: any) => {
      if (examName && r.exam_name !== examName) return false;
      if (dept) {
        const teacher = teachers.find((t: any) => t.id === r.teacher_id);
        if (!teacher || teacher.department !== dept) return false;
      }
      return true;
    });

    // Group by form
    const byForm: Record<string, Record<string, { teacher: string; div: string; grades: Record<string, number> }>> = {};

    filtered.forEach((r: any) => {
      const studentForm = r.students?.form || 'Unknown';
      const teacherName = r.teachers?.name || 'Unknown';
      const pct = P(Number(r.obtained_marks), Number(r.max_marks));
      const grade = G(pct);

      if (!byForm[studentForm]) byForm[studentForm] = {};
      const key = `${teacherName}__${studentForm}`;
      if (!byForm[studentForm][key]) {
        byForm[studentForm][key] = { teacher: teacherName, div: studentForm.replace('Form ', ''), grades: {} };
        GRADES.forEach(g => { byForm[studentForm][key].grades[g] = 0; });
      }
      byForm[studentForm][key].grades[grade] = (byForm[studentForm][key].grades[grade] || 0) + 1;
    });

    return byForm;
  }, [results, examName, dept, teachers]);

  const formOrder = FORMS.filter(f => analysis[f]);

  return (
    <div className="page-animate">
      <div className="mb-4">
        <div className="text-lg font-bold">HOD Grades Analysis</div>
        <div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>Teacher to Teacher Analysis · Pass% = 50% · Credit Pass = 60%+</div>
      </div>

      <Card title="Filters" className="mb-3.5">
        <div className="flex gap-3 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold mb-1" style={{ color: 'hsl(var(--text2))' }}>Department</div>
            <FilterSelect value={dept} onChange={setDept} allLabel="All Departments" options={departments.map((d: string) => ({ value: d, label: d }))} />
          </div>
          <div>
            <div className="text-[11px] font-semibold mb-1" style={{ color: 'hsl(var(--text2))' }}>Exam</div>
            <FilterSelect value={examName} onChange={setExamName} allLabel="All Exams" options={examNames.map((e: string) => ({ value: e, label: e }))} />
          </div>
        </div>
      </Card>

      {formOrder.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-xs" style={{ color: 'hsl(var(--text3))' }}>
            No exam results found. Enter exam results first to see the analysis.
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="text-center font-bold text-[13px] py-2.5 px-4" style={{ background: '#0d1117', color: '#e6edf3' }}>
            {dept || 'All Departments'} — {examName || 'All Exams'}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: '11.5px' }}>
              <thead>
                <tr style={{ background: '#f6f8fa', borderBottom: '2px solid hsl(var(--border))' }}>
                  <th className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Teacher</th>
                  <th className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Form</th>
                  {GRADES.map(g => <th key={g} className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{g}</th>)}
                  <th className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Total</th>
                  <th className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Credit%</th>
                  <th className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Pass%</th>
                </tr>
              </thead>
              <tbody>
                {formOrder.map(form => {
                  const rows = Object.values(analysis[form]);
                  const tot: Record<string, number> = {};
                  GRADES.forEach(g => { tot[g] = rows.reduce((s, r) => s + (r.grades[g] || 0), 0); });
                  const fT = GRADES.reduce((s, g) => s + tot[g], 0);
                  const fC = fT ? Math.round(['A*', 'A', 'B', 'C'].reduce((s, g) => s + tot[g], 0) / fT * 100) : 0;
                  const fP = fT ? Math.round(['A*', 'A', 'B', 'C', 'D'].reduce((s, g) => s + tot[g], 0) / fT * 100) : 0;

                  return (
                    <React.Fragment key={form}>
                      <tr style={{ background: '#f0f6ff' }}>
                        <td colSpan={2} className="py-2 px-3.5 font-bold text-[11px]" style={{ color: '#1f6feb' }}>📚 {form}</td>
                        {GRADES.map(g => <td key={g} />)}<td /><td /><td />
                      </tr>
                      {rows.map((row, ri) => {
                        const total = GRADES.reduce((s, g) => s + (row.grades[g] || 0), 0);
                        const credit = total ? Math.round(['A*', 'A', 'B', 'C'].reduce((s, g) => s + (row.grades[g] || 0), 0) / total * 100) : 0;
                        const pass = total ? Math.round(['A*', 'A', 'B', 'C', 'D'].reduce((s, g) => s + (row.grades[g] || 0), 0) / total * 100) : 0;
                        return (
                          <tr key={ri}>
                            <td className="font-semibold py-[9px] px-3.5">{row.teacher}</td>
                            <td className="text-center font-mono">{row.div}</td>
                            {GRADES.map(g => <td key={g} className="text-center font-mono font-bold" style={{ color: (row.grades[g] || 0) > 0 ? 'hsl(var(--text))' : '#d0d7de' }}>{row.grades[g] || 0}</td>)}
                            <td className="text-center font-bold font-mono">{total}</td>
                            <td className="text-center font-bold" style={{ color: credit >= 60 ? '#1a7f37' : '#cf222e' }}>{credit}%</td>
                            <td className="text-center font-bold" style={{ color: pass >= 50 ? '#1a7f37' : '#cf222e' }}>{pass}%</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: '#f0fff4' }}>
                        <td colSpan={2} className="py-2 px-3.5 font-bold text-[11px]" style={{ color: '#1a7f37' }}>TOTAL</td>
                        {GRADES.map(g => <td key={g} className="text-center font-bold font-mono" style={{ color: '#1a7f37' }}>{tot[g]}</td>)}
                        <td className="text-center font-bold font-mono" style={{ color: '#1a7f37' }}>{fT}</td>
                        <td className="text-center font-bold" style={{ color: fC >= 60 ? '#1a7f37' : '#cf222e' }}>{fC}%</td>
                        <td className="text-center font-bold" style={{ color: fP >= 50 ? '#1a7f37' : '#cf222e' }}>{fP}%</td>
                      </tr>
                      <tr><td colSpan={GRADES.length + 5} style={{ height: '8px' }} /></tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
