import React, { useState } from 'react';
import { DB, SUBJECTS, G, P, cap } from '@/data/database';
import { Badge, Card, SearchBar, FilterSelect, GradeChip, Btn, StatCard } from '@/components/SharedUI';

export function ExamsPage() {
  const exams = [
    { code: 'EXAM/0001', name: 'Mid-Term 1 2026', form: 'Form 1', state: 'done', start: '2026-03-01', end: '2026-03-07' },
    { code: 'EXAM/0002', name: 'End of Term 1 2026', form: 'Form 2', state: 'confirmed', start: '2026-04-20', end: '2026-04-28' },
    { code: 'EXAM/0003', name: 'Mid-Term 2 2026', form: 'Form 3', state: 'draft', start: '2026-07-10', end: '2026-07-17' },
  ];

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold">Examinations</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>GET /api/exams/</div></div>
        <Btn>＋ New Exam</Btn>
      </div>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {exams.map(e => (
          <Card key={e.code}>
            <div className="flex justify-between mb-2.5"><div className="font-bold text-sm">{e.name}</div><Badge status={e.state} /></div>
            <div className="text-[11px] mb-0.5" style={{ color: 'hsl(var(--text2))' }}>📋 {e.code}</div>
            <div className="text-[11px] mb-0.5" style={{ color: 'hsl(var(--text2))' }}>🏫 {e.form}</div>
            <div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>📅 {e.start} → {e.end}</div>
            <div className="mt-3 pt-2.5 flex gap-1.5" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              {e.state === 'draft' && <Btn variant="primary" size="sm">✓ Confirm</Btn>}
              {e.state === 'confirmed' && <Btn variant="blue" size="sm">▶ Start</Btn>}
              {e.state === 'done' && <Btn variant="outline" size="sm">📊 Results</Btn>}
              <Btn variant="outline" size="sm">✏️ Edit</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ResultsPage() {
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const exams = [...new Set(DB.results.map(r => r.exam))];
  const filt = DB.results.filter(r => (!search || r.student.toLowerCase().includes(search.toLowerCase())) && (!examFilter || r.exam === examFilter));

  return (
    <div className="page-animate">
      <div className="mb-4"><div className="text-lg font-bold">Exam Results</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>GET /api/exams/results/</div></div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search...">
          <FilterSelect value={examFilter} onChange={setExamFilter} allLabel="All Exams" options={exams.map(e => ({ value: e, label: e }))} />
        </SearchBar>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Student','Subject','Marks','%','Grade','Status'].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filt.slice(0, 50).map((r, i) => {
                const p = P(r.obtained, r.max);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <td className="py-2.5 px-3.5 font-semibold">{r.student}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{r.subject}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]">{r.obtained}/{r.max}</td>
                    <td className="py-2.5 px-3.5 font-mono font-bold">{p}%</td>
                    <td className="py-2.5 px-3.5"><GradeChip grade={G(p)} /></td>
                    <td className="py-2.5 px-3.5"><Badge status={r.state} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="text-[11px] mt-2.5" style={{ color: 'hsl(var(--text2))' }}>{filt.length} results</div>
        </div>
      </Card>
    </div>
  );
}

export function AttendancePage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const tA = DB.attendance.filter(a => a.date === todayStr);
  const present = tA.filter(a => a.state === 'present').length;
  const absent = tA.filter(a => a.state === 'absent').length;
  const late = tA.filter(a => a.state === 'late').length;

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold">Attendance — {todayStr}</div>
        <Btn>＋ Mark Attendance</Btn>
      </div>
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          { val: present, label: 'Present', bg: '#dafbe1', border: '#aceebb', color: '#1a7f37' },
          { val: absent, label: 'Absent', bg: '#ffebe9', border: '#ffc1ba', color: '#cf222e' },
          { val: late, label: 'Late', bg: '#fff8c5', border: '#ffe07c', color: '#9a6700' },
          { val: 0, label: 'Excused', bg: '#ddf4ff', border: '#addcff', color: '#0969da' },
        ].map(item => (
          <div key={item.label} className="rounded-lg px-4 py-3.5" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
            <div className="text-[28px] font-bold font-mono" style={{ color: item.color }}>{item.val}</div>
            <div className="text-[11px] font-semibold" style={{ color: item.color }}>{item.label}</div>
          </div>
        ))}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Student','Form','Division','Date','Status'].map(h => (
                <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {DB.attendance.slice(0, 20).map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f6f8fa' }}>
                  <td className="py-2.5 px-3.5 font-semibold">{a.student}</td>
                  <td className="py-2.5 px-3.5">{a.form}</td>
                  <td className="py-2.5 px-3.5 font-mono text-[11px]">{a.div}</td>
                  <td className="py-2.5 px-3.5 font-mono text-[11px]">{a.date}</td>
                  <td className="py-2.5 px-3.5"><Badge status={a.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function HODPage() {
  const [generating, setGenerating] = useState(false);
  const GS = ['A*','A','B','C','D','E','F','G','U'];
  const HOD: Record<string, { teacher: string; div: string; grades: Record<string, number> }[]> = {
    'Form 1': [
      { teacher: 'Ms. Makoni', div: '1B', grades: {'A*':2,'A':4,'B':7,'C':4,'D':1,'E':1,'F':0,'G':0,'U':1} },
      { teacher: 'Ms. Nkosi', div: '1K', grades: {'A*':9,'A':6,'B':5,'C':0,'D':0,'E':0,'F':0,'G':0,'U':0} },
    ],
    'Form 2': [
      { teacher: 'Ms. Makoni', div: '2B', grades: {'A*':2,'A':2,'B':2,'C':3,'D':4,'E':4,'F':3,'G':1,'U':1} },
      { teacher: 'Ms. Nkosi', div: '2K', grades: {'A*':1,'A':1,'B':3,'C':3,'D':4,'E':1,'F':0,'G':0,'U':7} },
    ],
  };

  const genHOD = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 1200);
  };

  return (
    <div className="page-animate">
      <div className="mb-4"><div className="text-lg font-bold">HOD Grades Analysis</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>POST /api/reports/hod-report/ → .xlsx</div></div>
      <Card title="Generate Report" className="mb-3.5">
        <div className="grid grid-cols-3 gap-3.5 mb-3.5">
          <div>
            <div className="text-[11px] font-semibold mb-1.5" style={{ color: 'hsl(var(--text2))' }}>Subject</div>
            <select className="w-full border rounded-md py-[7px] px-2.5 text-xs font-sans cursor-pointer" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface2))' }}>
              <option>Computer Science</option>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[11px] font-semibold mb-1.5" style={{ color: 'hsl(var(--text2))' }}>Exam</div>
            <select className="w-full border rounded-md py-[7px] px-2.5 text-xs font-sans cursor-pointer" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface2))' }}>
              <option>Mid-Term 1 2026</option>
            </select>
          </div>
          <div>
            <div className="text-[11px] font-semibold mb-1.5" style={{ color: 'hsl(var(--text2))' }}>Thresholds</div>
            <select className="w-full border rounded-md py-[7px] px-2.5 text-xs font-sans cursor-pointer" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface2))' }}>
              <option>Pass=50% | Credit=60%</option>
            </select>
          </div>
        </div>
        <Btn onClick={genHOD} disabled={generating}>{generating ? '⏳ Generating…' : '📊 Generate XLSX'}</Btn>
      </Card>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="text-center font-bold text-[13px] py-2.5 px-4" style={{ background: '#0d1117', color: '#e6edf3' }}>Computer Science — Mid-Term 1 2026</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: '11.5px' }}>
            <thead><tr style={{ background: '#f6f8fa', borderBottom: '2px solid hsl(var(--border))' }}>
              <th className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Teacher</th>
              <th className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Div</th>
              {GS.map(g => <th key={g} className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{g}</th>)}
              <th className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Total</th>
              <th className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Credit%</th>
              <th className="py-[9px] px-3.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>Pass%</th>
            </tr></thead>
            <tbody>
              {Object.entries(HOD).map(([fn, rows]) => {
                const tot: Record<string, number> = {};
                GS.forEach(g => { tot[g] = rows.reduce((s, r) => s + (r.grades[g] || 0), 0); });
                const fT = GS.reduce((s, g) => s + tot[g], 0);
                const fC = fT ? Math.round(['A*','A','B','C'].reduce((s, g) => s + tot[g], 0) / fT * 100) : 0;
                const fP = fT ? Math.round(['A*','A','B','C','D','E'].reduce((s, g) => s + tot[g], 0) / fT * 100) : 0;
                return (
                  <React.Fragment key={fn}>
                    <tr style={{ background: '#f0f6ff' }}>
                      <td colSpan={2} className="py-2 px-3.5 font-bold text-[11px]" style={{ color: '#1f6feb' }}>📚 {fn}</td>
                      {GS.map(g => <td key={g} />)}
                      <td /><td /><td />
                    </tr>
                    {rows.map((row, ri) => {
                      const total = GS.reduce((s, g) => s + (row.grades[g] || 0), 0);
                      const credit = total ? Math.round(['A*','A','B','C'].reduce((s, g) => s + (row.grades[g] || 0), 0) / total * 100) : 0;
                      const pass_ = total ? Math.round(['A*','A','B','C','D','E'].reduce((s, g) => s + (row.grades[g] || 0), 0) / total * 100) : 0;
                      return (
                        <tr key={ri}>
                          <td className="font-semibold py-[9px] px-3.5">{row.teacher}</td>
                          <td className="text-center font-mono">{row.div}</td>
                          {GS.map(g => <td key={g} className="text-center font-mono font-bold" style={{ color: (row.grades[g] || 0) > 0 ? 'hsl(var(--text))' : '#d0d7de' }}>{row.grades[g] || 0}</td>)}
                          <td className="text-center font-bold font-mono">{total}</td>
                          <td className="text-center font-bold" style={{ color: credit >= 60 ? '#1a7f37' : '#cf222e' }}>{credit}%</td>
                          <td className="text-center font-bold" style={{ color: pass_ >= 50 ? '#1a7f37' : '#cf222e' }}>{pass_}%</td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: '#f0fff4' }}>
                      <td colSpan={2} className="py-2 px-3.5 font-bold text-[11px]" style={{ color: '#1a7f37' }}>TOTAL</td>
                      {GS.map(g => <td key={g} className="text-center font-bold font-mono" style={{ color: '#1a7f37' }}>{tot[g]}</td>)}
                      <td className="text-center font-bold font-mono" style={{ color: '#1a7f37' }}>{fT}</td>
                      <td className="text-center font-bold" style={{ color: fC >= 60 ? '#1a7f37' : '#cf222e' }}>{fC}%</td>
                      <td className="text-center font-bold" style={{ color: fP >= 50 ? '#1a7f37' : '#cf222e' }}>{fP}%</td>
                    </tr>
                    <tr><td colSpan={GS.length + 5} style={{ height: '8px' }} /></tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function ConfigPage() {
  return (
    <div className="page-animate">
      <div className="text-lg font-bold mb-4">Configuration</div>
      <div className="grid grid-cols-2 gap-3.5">
        <Card title="📅 Academic Years">
          {[{ y: '2026', s: 'active', c: true }, { y: '2025', s: 'closed', c: false }].map(({ y, s, c }) => (
            <div key={y} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <span style={{ color: 'hsl(var(--text2))' }}>{y} {c ? '⭐' : ''}</span>
              <Badge status={s} />
            </div>
          ))}
        </Card>
        <Card title="🏫 Forms & Divisions">
          {SUBJECTS.length && Object.entries({ 'Form 1': 8, 'Form 2': 8, 'Form 3': 8, 'Form 4': 8, 'Form 5': 8, 'Form 6': 4, 'Form 7': 4 }).map(([f, n]) => (
            <div key={f} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <span style={{ color: 'hsl(var(--text2))' }}>{f}</span>
              <span className="font-mono">{n} divs</span>
            </div>
          ))}
        </Card>
        <Card title={`📚 Subjects (${SUBJECTS.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {SUBJECTS.map(s => (
              <span key={s} className="rounded-[5px] px-[9px] py-0.5 text-[11px]" style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>{s}</span>
            ))}
          </div>
        </Card>
        <Card title="🔌 API Endpoints">
          {['/api/assignments/', 'POST /api/assignments/{id}/submit/', 'POST /api/assignments/{id}/grade/', 'POST /api/reports/hod-report/'].map(e => (
            <div key={e} className="font-mono text-[10px] py-1.5" style={{ borderBottom: '1px solid #f6f8fa', color: '#1f6feb' }}>{e}</div>
          ))}
        </Card>
      </div>
    </div>
  );
}
