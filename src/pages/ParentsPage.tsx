import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useParents, useParentStudents, useStudents, useInvalidate } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { cap } from '@/data/database';
import { downloadExcel, parseExcel, triggerFileUpload } from '@/lib/excel';
import { Badge, Card, InfoRow, SearchBar, BackBtn, Btn,
  Modal, ModalHead, ModalBody, ModalFoot, FormSection, Field, FieldInput, FieldSelect } from '@/components/SharedUI';

export default function ParentsPage() {
  const { detail, setDetail, setPage, showToast } = useApp();
  const { isAdmin } = useAuth();
  const { data: parents = [], isLoading } = useParents();
  const { data: parentStudents = [] } = useParentStudents();
  const invalidate = useInvalidate();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<string | 'new' | null>(null);

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

  const handleExport = () => {
    downloadExcel(rows.map((p: any) => ({
      'Name': p.name, 'Relation': cap(p.relation || ''),
      'Phone': p.phone || '', 'Email': p.email || '',
      'Children': parentStudents.filter((ps: any) => ps.parent_id === p.id).length,
    })), 'parents_export', 'Parents');
    showToast('Parents exported');
  };

  const handleDownloadTemplate = () => {
    downloadExcel(
      [
        {
          'Name': '',
          'Relation': '',
          'Phone': '',
          'Alternative Phone': '',
          'Email': '',
          'Occupation': '',
          'Home Address': '',
          'National ID': '',
          'Passport Number': '',
        },
      ],
      'parents_import_template',
      'Parents',
    );
    showToast('Template downloaded');
  };

  const handleImport = async () => {
    const file = await triggerFileUpload();
    if (!file) return;
    try {
      const data = await parseExcel(file);
      let count = 0;
      for (const row of data) {
        const name = row['Name'] || row['name'];
        if (!name) continue;
        const { error } = await supabase.from('parents').insert({
          name,
          relation: row['Relation'] || row['relation'] || null,
          phone: row['Phone'] || row['phone'] || null,
          alternative_phone: row['Alternative Phone'] || row['alternative_phone'] || null,
          email: row['Email'] || row['email'] || null,
          occupation: row['Occupation'] || row['occupation'] || null,
          address: row['Home Address'] || row['address'] || null,
          national_id: row['National ID'] || row['national_id'] || null,
          passport_number: row['Passport Number'] || row['passport_number'] || null,
        });
        if (!error) count++;
      }
      showToast(`Imported ${count} parents`);
      invalidate(['parents']);
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold">Parents</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{parents.length} total</div></div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}>⬇ Export</Btn>
          {isAdmin && <Btn variant="outline" onClick={handleDownloadTemplate}><i className="fas fa-file-excel mr-1" />Template</Btn>}
          {isAdmin && <Btn variant="outline" onClick={handleImport}>⬆ Import</Btn>}
          {isAdmin && <Btn onClick={() => setModal('new')}>＋ New Parent</Btn>}
        </div>
      </div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search..." />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
              {['Name','Relation','Phone','Email','Children', ...(isAdmin ? ['Actions'] : [])].map(h => (
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
                    {isAdmin && (
                      <td className="py-2.5 px-3.5">
                        <div className="flex gap-1">
                          <Btn variant="outline" size="sm" onClick={(e: any) => { e.stopPropagation(); setModal(p.id); }}>✏️</Btn>
                          <Btn variant="danger" size="sm" onClick={async (e: any) => {
                            e.stopPropagation();
                            if (!confirm('Delete this parent?')) return;
                            await supabase.from('parents').delete().eq('id', p.id);
                            invalidate(['parents']);
                            showToast('Parent deleted');
                          }}>🗑</Btn>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {modal !== null && <ParentModal id={modal === 'new' ? null : modal} parents={parents} onClose={() => { setModal(null); invalidate(['parents']); }} />}
    </div>
  );
}

function ParentModal({ id, parents, onClose }: { id: string | null; parents: any[]; onClose: () => void }) {
  const { showToast } = useApp();
  const invalidate = useInvalidate();
  const { data: allStudents = [] } = useStudents();
  const existing = id ? parents.find((p: any) => p.id === id) : null;

  // Contact
  const [name, setName] = useState(existing?.name || '');
  const [relation, setRelation] = useState(existing?.relation || 'father');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [altPhone, setAltPhone] = useState(existing?.alternative_phone || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [occupation, setOccupation] = useState(existing?.occupation || '');

  // Identity
  const [nationalId, setNationalId] = useState(existing?.national_id || '');
  const [passportNumber, setPassportNumber] = useState(existing?.passport_number || '');

  // Child linking (new parent only)
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [saving, setSaving] = useState(false);

  const parentPayload = {
    name,
    relation,
    phone: phone || null,
    alternative_phone: altPhone || null,
    email: email || null,
    address: address || null,
    occupation: occupation || null,
    national_id: nationalId || null,
    passport_number: passportNumber || null,
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (id) {
      const { error } = await supabase.from('parents').update(parentPayload).eq('id', id);
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      showToast('Parent updated');
    } else {
      const { data: newParent, error } = await supabase
        .from('parents')
        .insert(parentPayload)
        .select('id')
        .single();
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }

      // Link child if selected
      if (selectedStudentId && newParent) {
        await supabase.from('parent_students').insert({ parent_id: newParent.id, student_id: selectedStudentId });
      }

      invalidate(['parents', 'parent_students']);
      showToast(`Parent "${name}" created`);
    }
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={id ? 'Edit Parent' : 'Add Parent'} onClose={onClose} />
      <ModalBody>
        {/* ── Contact Information ── */}
        <FormSection title="Contact Information" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name" required><FieldInput value={name} onChange={setName} /></Field>
          <Field label="Relation">
            <FieldSelect value={relation} onChange={setRelation}
              options={['father','mother','guardian','grandparent','other'].map(r => ({ value: r, label: cap(r) }))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><FieldInput value={phone} onChange={setPhone} type="tel" /></Field>
          <Field label="Alternative Phone"><FieldInput value={altPhone} onChange={setAltPhone} type="tel" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><FieldInput value={email} onChange={setEmail} type="email" /></Field>
          <Field label="Occupation"><FieldInput value={occupation} onChange={setOccupation} placeholder="e.g. Engineer" /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <Field label="Home Address"><FieldInput value={address} onChange={setAddress} placeholder="Street, City" /></Field>
        </div>

        {/* ── Identity Documents ── */}
        <FormSection title="Identity Documents" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="National ID"><FieldInput value={nationalId} onChange={setNationalId} /></Field>
          <Field label="Passport Number"><FieldInput value={passportNumber} onChange={setPassportNumber} /></Field>
        </div>

        {/* ── Link Child (new parent only) ── */}
        {!id && (
          <>
            <FormSection title="Link to Child (Student)" />
            <div className="grid grid-cols-1 gap-3">
              <Field label="Student">
                <FieldSelect
                  value={selectedStudentId}
                  onChange={setSelectedStudentId}
                  options={[
                    { value: '', label: '— None / add later —' },
                    ...allStudents.map((s: any) => ({ value: s.id, label: `${s.full_name} (${s.form}${s.class_name ? ' ' + s.class_name : ''})` })),
                  ]}
                />
              </Field>
            </div>
          </>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : id ? 'Update' : 'Create'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
