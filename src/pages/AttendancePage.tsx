import React, { useState, useMemo } from 'react';
import { useAttendance, useStudents, useTeachers, useClassTeachers, useInvalidate } from '@/hooks/useSupabaseData';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { FORMS, cap } from '@/data/database';
import { downloadExcel } from '@/lib/excel';
import { Badge, Card, Btn, FilterSelect } from '@/components/SharedUI';

export default function AttendancePage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [markingForm, setMarkingForm] = useState('');
  const [markingClass, setMarkingClass] = useState('');
  const [marking, setMarking] = useState(false);
  const { data: attendance = [], isLoading } = useAttendance(date);
  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const { data: classTeachers = [] } = useClassTeachers();
  const { isTeacher, isAdmin, user } = useAuth();
  const { showToast } = useApp();
  const invalidate = useInvalidate();

  const myTeacher = teachers.find((t: any) => t.user_id === user?.id);
  const myClasses = useMemo(() => {
    if (isAdmin) return null; // Admin can mark any class
    if (myTeacher) return classTeachers.filter((ct: any) => ct.teacher_id === myTeacher.id);
    return [];
  }, [classTeachers, myTeacher, isAdmin]);

  const canMarkAttendance = isAdmin || (myClasses && myClasses.length > 0);

  const markingStudents = useMemo(() => {
    return students.filter((s: any) => {
      if (!markingForm) return false;
      if (s.form !== markingForm) return false;
      if (markingClass && s.class_name !== markingClass) return false;
      return s.state === 'active';
    });
  }, [students, markingForm, markingClass]);

  const present = attendance.filter((a: any) => a.status === 'present').length;
  const absent = attendance.filter((a: any) => a.status === 'absent').length;
  const late = attendance.filter((a: any) => a.status === 'late').length;

  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, string>>({});

  const startMarking = () => {
    if (!markingForm) return;
    const marks: Record<string, string> = {};
    markingStudents.forEach((s: any) => { marks[s.id] = 'present'; });
    setAttendanceMarks(marks);
    setMarking(true);
  };

  const saveAttendance = async () => {
    const records = Object.entries(attendanceMarks).map(([sid, status]) => ({
      student_id: sid, date, status,
    }));
    const { error } = await supabase.from('attendance').insert(records);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`Attendance saved for ${records.length} students`);
    setMarking(false);
    invalidate(['attendance']);
  };

  const handleExport = () => {
    downloadExcel(attendance.map((a: any) => ({
      'Student': a.students?.full_name || '', 'Form': a.students?.form || '',
      'Class': a.students?.class_name || '', 'Date': a.date, 'Status': cap(a.status),
    })), `attendance_${date}`, 'Attendance');
    showToast('Attendance exported');
  };

  // Available forms for marking (class teachers only see their forms)
  const availableForms: string[] = useMemo(() => {
    if (isAdmin) return FORMS;
    if (myClasses) return Array.from(new Set(myClasses.map((ct: any) => String(ct.form))));
    return [] as string[];
  }, [isAdmin, myClasses]);

  const availableClasses: string[] = useMemo(() => {
    if (!markingForm) return [];
    if (isAdmin) return [...new Set(students.filter((s: any) => s.form === markingForm).map((s: any) => s.class_name).filter(Boolean))] as string[];
    if (myClasses) return myClasses.filter((ct: any) => ct.form === markingForm).map((ct: any) => ct.class_name as string);
    return [];
  }, [markingForm, isAdmin, myClasses, students]);

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold"><i className="fas fa-calendar-check mr-2" />Attendance — {date}</div>
        <div className="flex gap-2 items-center">
          <Btn variant="outline" onClick={handleExport}><i className="fas fa-download mr-1" />Export</Btn>
          {canMarkAttendance && !marking && (
            <>
              <FilterSelect value={markingForm} onChange={v => { setMarkingForm(v); setMarkingClass(''); }}
                allLabel="Select Form" options={availableForms.map(f => ({ value: f, label: f }))} />
              {markingForm && availableClasses.length > 0 && (
                <FilterSelect value={markingClass} onChange={setMarkingClass}
                  allLabel="All Classes" options={availableClasses.map(c => ({ value: c, label: c }))} />
              )}
              <Btn onClick={startMarking} disabled={!markingForm}><i className="fas fa-plus mr-1" />Mark</Btn>
            </>
          )}
        </div>
      </div>

      {!canMarkAttendance && isTeacher && (
        <div className="rounded-md px-4 py-3 mb-4 text-[12px]" style={{ background: '#fff8c5', border: '1px solid #ffe07c', color: '#9a6700' }}>
          <i className="fas fa-info-circle mr-1" />Attendance marking is restricted to class teachers. Contact admin to be assigned as a class teacher.
        </div>
      )}

      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          { val: present, label: 'Present', bg: '#dafbe1', border: '#aceebb', color: '#1a7f37' },
          { val: absent, label: 'Absent', bg: '#ffebe9', border: '#ffc1ba', color: '#cf222e' },
          { val: late, label: 'Late', bg: '#fff8c5', border: '#ffe07c', color: '#9a6700' },
          { val: attendance.length, label: 'Total', bg: '#ddf4ff', border: '#addcff', color: '#0969da' },
        ].map(item => (
          <div key={item.label} className="rounded-lg px-4 py-3.5" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
            <div className="text-[28px] font-bold font-mono" style={{ color: item.color }}>{item.val}</div>
            <div className="text-[11px] font-semibold" style={{ color: item.color }}>{item.label}</div>
          </div>
        ))}
      </div>

      {marking ? (
        <Card title={`Mark Attendance — ${markingForm}${markingClass ? ' ' + markingClass : ''} — ${date}`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                {['Student','Class','Status'].map(h => (
                  <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {markingStudents.map((s: any) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f6f8fa' }}>
                    <td className="py-2.5 px-3.5 font-semibold">{s.full_name}</td>
                    <td className="py-2.5 px-3.5 text-[11px]">{s.class_name || '—'}</td>
                    <td className="py-2.5 px-3.5">
                      <div className="flex gap-1">
                        {['present', 'absent', 'late'].map(st => (
                          <button key={st} onClick={() => setAttendanceMarks(m => ({ ...m, [s.id]: st }))}
                            className="px-2 py-1 rounded text-[10px] font-semibold border-none cursor-pointer"
                            style={{
                              background: attendanceMarks[s.id] === st ? (st === 'present' ? '#dafbe1' : st === 'absent' ? '#ffebe9' : '#fff8c5') : '#f6f8fa',
                              color: attendanceMarks[s.id] === st ? (st === 'present' ? '#1a7f37' : st === 'absent' ? '#cf222e' : '#9a6700') : '#656d76',
                            }}>{cap(st)}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn onClick={saveAttendance}><i className="fas fa-check mr-1" />Save Attendance</Btn>
            <Btn variant="outline" onClick={() => setMarking(false)}>Cancel</Btn>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-3">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border rounded-md py-[7px] px-2.5 text-xs font-sans"
              style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface2))' }} />
          </div>
          {isLoading ? <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>Loading...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                  {['Student','Form','Class','Date','Status'].map(h => (
                    <th key={h} className="py-[9px] px-3.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {attendance.slice(0, 50).map((a: any) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f6f8fa' }}>
                      <td className="py-2.5 px-3.5 font-semibold">{a.students?.full_name || '—'}</td>
                      <td className="py-2.5 px-3.5">{a.students?.form || '—'}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{a.students?.class_name || '—'}</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px]">{a.date}</td>
                      <td className="py-2.5 px-3.5"><Badge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[11px] mt-2" style={{ color: 'hsl(var(--text2))' }}>{attendance.length} records</div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
