import React, { useState } from 'react';
import { useSubjects, useTeachers, useHODAssignments, useHOYAssignments, useInvalidate } from '@/hooks/useSupabaseData';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { FORMS, cap } from '@/data/database';
import { Card, Badge, Btn, FilterSelect, Modal, ModalHead, ModalBody, ModalFoot, Field, FieldSelect } from '@/components/SharedUI';

export default function ConfigPage() {
  const { data: subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  const { data: hodAssignments = [] } = useHODAssignments();
  const { data: hoyAssignments = [] } = useHOYAssignments();
  const { isAdmin } = useAuth();
  const { showToast } = useApp();
  const invalidate = useInvalidate();
  const [hodModal, setHodModal] = useState(false);
  const [hoyModal, setHoyModal] = useState(false);

  return (
    <div className="page-animate">
      <div className="text-lg font-bold mb-4">Configuration</div>
      <div className="grid grid-cols-2 gap-3.5">
        <Card title="📅 Academic Years">
          {[{ y: '2026', s: 'active' }, { y: '2025', s: 'closed' }].map(({ y, s }) => (
            <div key={y} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <span style={{ color: 'hsl(var(--text2))' }}>{y}</span>
              <Badge status={s} />
            </div>
          ))}
        </Card>

        <Card title={`📚 Subjects (${subjects.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((s: any) => (
              <span key={s.id} className="rounded-[5px] px-[9px] py-0.5 text-[11px]" style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>
                {s.name} <span className="font-mono text-[9px]" style={{ color: 'hsl(var(--text3))' }}>{s.code}</span>
              </span>
            ))}
          </div>
        </Card>

        <Card title="📈 HOD Assignments" titleRight={isAdmin && <Btn variant="outline" size="sm" onClick={() => setHodModal(true)}>＋ Assign</Btn>}>
          {hodAssignments.length === 0 ? <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No HOD assignments</div> : (
            hodAssignments.map((h: any) => (
              <div key={h.id} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
                <span className="font-semibold">{h.teachers?.name || '—'}</span>
                <span style={{ color: 'hsl(var(--text2))' }}>{h.department}</span>
              </div>
            ))
          )}
        </Card>

        <Card title="📊 HOY Assignments" titleRight={isAdmin && <Btn variant="outline" size="sm" onClick={() => setHoyModal(true)}>＋ Assign</Btn>}>
          {hoyAssignments.length === 0 ? <div className="text-xs" style={{ color: 'hsl(var(--text3))' }}>No HOY assignments</div> : (
            hoyAssignments.map((h: any) => (
              <div key={h.id} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
                <span className="font-semibold">{h.teachers?.name || '—'}</span>
                <span style={{ color: 'hsl(var(--text2))' }}>{h.form}</span>
              </div>
            ))
          )}
        </Card>

        <Card title="🏫 Forms">
          {FORMS.map(f => (
            <div key={f} className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <span style={{ color: 'hsl(var(--text2))' }}>{f}</span>
            </div>
          ))}
        </Card>

        <Card title="👩‍🏫 User Roles">
          <div className="text-xs" style={{ color: 'hsl(var(--text2))' }}>
            <div className="mb-1">Admin, Teacher, Student, Parent, HOD, HOY</div>
            <div className="text-[10px]" style={{ color: 'hsl(var(--text3))' }}>Assign HOD/HOY roles using the cards above. Teacher and Student roles are auto-assigned during onboarding.</div>
          </div>
        </Card>
      </div>

      {hodModal && <RoleModal type="hod" teachers={teachers} onClose={() => { setHodModal(false); invalidate(['hod_assignments']); }} />}
      {hoyModal && <RoleModal type="hoy" teachers={teachers} onClose={() => { setHoyModal(false); invalidate(['hoy_assignments']); }} />}
    </div>
  );
}

function RoleModal({ type, teachers, onClose }: { type: 'hod' | 'hoy'; teachers: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const [teacherId, setTeacherId] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const departments = [...new Set(teachers.map((t: any) => t.department).filter(Boolean))].sort();

  const save = async () => {
    if (!teacherId || !value) return;
    setSaving(true);
    if (type === 'hod') {
      const { error } = await supabase.from('hod_assignments').insert({ teacher_id: teacherId, department: value });
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      // Also add HOD role
      const teacher = teachers.find((t: any) => t.id === teacherId) as any;
      if (teacher?.user_id) {
        await supabase.from('user_roles').upsert({ user_id: teacher.user_id, role: 'hod' }, { onConflict: 'user_id,role' });
      }
    } else {
      const { error } = await supabase.from('hoy_assignments').insert({ teacher_id: teacherId, form: value });
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      const teacher = teachers.find((t: any) => t.id === teacherId) as any;
      if (teacher?.user_id) {
        await supabase.from('user_roles').upsert({ user_id: teacher.user_id, role: 'hoy' }, { onConflict: 'user_id,role' });
      }
    }
    showToast(`${type.toUpperCase()} assignment created`);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={`Assign ${type.toUpperCase()}`} onClose={onClose} />
      <ModalBody>
        <Field label="Teacher" required>
          <FieldSelect value={teacherId} onChange={setTeacherId}
            options={[{ value: '', label: '— Select —' }, ...teachers.map((t: any) => ({ value: t.id, label: t.name }))]} />
        </Field>
        <Field label={type === 'hod' ? 'Department' : 'Form'} required>
          <FieldSelect value={value} onChange={setValue}
            options={[{ value: '', label: '— Select —' }, ...(type === 'hod' ? departments.map(d => ({ value: d, label: d })) : FORMS.map(f => ({ value: f, label: f })))]} />
        </Field>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Assign'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
