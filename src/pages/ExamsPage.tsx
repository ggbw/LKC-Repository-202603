import React from 'react';
import { Card, Badge, Btn } from '@/components/SharedUI';

export default function ExamsPage() {
  const exams = [
    { code: 'EXAM/0001', name: 'Mid-Term 1 2026', form: 'All Forms', state: 'draft', start: '2026-03-01', end: '2026-03-07' },
    { code: 'EXAM/0002', name: 'End of Term 1 2026', form: 'All Forms', state: 'draft', start: '2026-04-20', end: '2026-04-28' },
  ];

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold">Examinations</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>Manage exam periods</div></div>
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
              <Btn variant="primary" size="sm">✓ Confirm</Btn>
              <Btn variant="outline" size="sm">✏️ Edit</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
