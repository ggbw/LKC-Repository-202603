import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DB, RELATIONS, cap } from '@/data/database';
import { Badge, Card, InfoRow, SearchBar, Btn, BackBtn,
  Modal, ModalHead, ModalBody, ModalFoot, FormSection, Field, FieldInput, FieldSelect, DeleteModal } from '@/components/SharedUI';

export default function ParentsPage() {
  const { detail, setDetail, setPage, showToast, refresh, tick } = useApp();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<number | 'new' | null>(null);
  const [delModal, setDelModal] = useState<{ id: number; name: string } | null>(null);

  if (detail) return <ParentDetail id={detail} />;

  const rows = DB.parents.filter(p => !search || p.parent_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold">Parents</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>POST /api/parents/ · {DB.parents.length} total</div></div>
        <Btn variant="blue" onClick={() => setModal('new')}>＋ New Parent</Btn>
      </div>
      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍  Search..." />
        {rows.length === 0 ? <div className="py-10 text-center text-xs" style={{ color: 'hsl(var(--text3))' }}>No parents found</div> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                {['#','Name','Relation','Phone','Email','Children','Actions'].map(h => (
                  <th key={h} className={`py-[9px] px-3.5 text-[10px] font-semibold uppercase tracking-wide ${h === 'Children' || h === 'Actions' ? 'text-center' : 'text-left'}`} style={{ color: 'hsl(var(--text2))' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((p, i) => {
                  const cnt = DB.students.filter(s => s.parent_id === p.id).length;
                  return (
                    <tr key={p.id} className="hover:bg-[hsl(var(--surface2))]" style={{ borderBottom: '1px solid #f6f8fa' }}>
                      <td className="py-2.5 px-3.5 font-mono text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{String(i + 1).padStart(3, '0')}</td>
                      <td className="py-2.5 px-3.5 font-semibold cursor-pointer" style={{ color: '#1f6feb' }} onClick={() => setDetail(p.id)}>{p.parent_name}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{cap(p.relation_with_child)}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{p.phone || '—'}</td>
                      <td className="py-2.5 px-3.5 text-[11px]">{p.email || '—'}</td>
                      <td className="py-2.5 px-3.5 text-center font-bold font-mono">{cnt}</td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <Btn variant="outline" size="sm" onClick={() => setModal(p.id)}>✏️</Btn>
                        <Btn variant="outline" size="sm" onClick={() => setDelModal({ id: p.id, name: p.parent_name })}
                          className="ml-1" style={{ background: '#ffebe9', color: '#cf222e', borderColor: '#ffc1ba' }}>🗑</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {modal !== null && <ParentModal id={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
      {delModal && <DeleteModal title="Delete Parent?" message={`"${delModal.name}"`} api={`DELETE /api/parents/${delModal.id}/`}
        onClose={() => setDelModal(null)} onConfirm={() => {
          const i = DB.parents.findIndex(p => p.id === delModal.id);
          if (i > -1) DB.parents.splice(i, 1);
          DB.students.filter(s => s.parent_id === delModal.id).forEach(s => { s.parent_id = null; s.parent_name = null; });
          setDelModal(null); showToast(`"${delModal.name}" deleted`, 'info'); setDetail(null); refresh();
        }} />}
    </div>
  );
}

function ParentDetail({ id }: { id: number }) {
  const { setDetail, setPage, tick } = useApp();
  const [modal, setModal] = useState<number | null>(null);
  const p = DB.parents.find(x => x.id === id);
  if (!p) return <BackBtn onClick={() => setDetail(null)} label="Back" />;
  const children = DB.students.filter(s => s.parent_id === p.id);
  return (
    <div className="page-animate">
      <BackBtn onClick={() => setDetail(null)} label="Back to Parents" />
      <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center text-[32px] flex-shrink-0" style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border))' }}>👪</div>
        <div>
          <div className="text-xl font-bold">{p.parent_name}</div>
          <div className="text-xs mt-1" style={{ color: 'hsl(var(--text2))' }}>{cap(p.relation_with_child)}</div>
          <div className="mt-2"><Btn variant="blue" size="sm" onClick={() => setModal(p.id)}>✏️ Edit</Btn></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title="Contact">
          {[['Phone', p.phone || '—'], ['Email', p.email || '—'], ['City', p.city || '—'], ['Occupation', p.occupation || '—']].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}
        </Card>
        <Card title={`Children (${children.length})`}>
          {children.length ? children.map(s => (
            <div key={s.id} className="flex justify-between items-center py-2 text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <div>
                <div className="font-semibold cursor-pointer" style={{ color: '#1f6feb' }} onClick={() => { setPage('students'); setDetail(s.id); }}>{s.student_full_name}</div>
                <div className="text-[10px]" style={{ color: 'hsl(var(--text2))' }}>{s.form} · {s.division}</div>
              </div>
              <Badge status={s.state} />
            </div>
          )) : <div className="text-xs py-2.5" style={{ color: 'hsl(var(--text3))' }}>No students linked.</div>}
        </Card>
      </div>
      {modal !== null && <ParentModal id={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function ParentModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { showToast, refresh } = useApp();
  const p = id ? DB.parents.find(x => x.id === id) : null;
  const isEdit = !!p;
  const [name, setName] = useState(p?.parent_name || '');
  const [rel, setRel] = useState(p?.relation_with_child || 'father');
  const [phone, setPhone] = useState(p?.phone || '');
  const [email, setEmail] = useState(p?.email || '');
  const [occ, setOcc] = useState(p?.occupation || '');
  const [city, setCity] = useState(p?.city || 'Gaborone');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = () => {
    const errs: Record<string, string> = {};
    if (!name) errs.name = 'Required.';
    if (!phone) errs.phone = 'Required.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const data = { parent_name: name, relation_with_child: rel, phone, email, occupation: occ, city, mobile: '', employer: '', notes: '' };
    setTimeout(() => {
      if (id && p) {
        Object.assign(p, data);
        DB.students.filter(s => s.parent_id === id).forEach(s => s.parent_name = name);
      } else {
        DB.parents.push({ id: DB._pid++, ...data });
      }
      showToast(`Parent "${name}" ${id ? 'updated' : 'created'}`);
      onClose(); refresh();
    }, 400);
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={isEdit ? '✏️ Edit Parent' : '➕ Add Parent'} onClose={onClose} />
      <ModalBody>
        <FormSection title="Basic Information" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name" required error={errors.name}><FieldInput value={name} onChange={setName} hasError={!!errors.name} /></Field>
          <Field label="Relation"><FieldSelect value={rel} onChange={setRel} options={RELATIONS.map(r => ({ value: r, label: cap(r) }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" required error={errors.phone}><FieldInput value={phone} onChange={setPhone} hasError={!!errors.phone} /></Field>
          <Field label="Email"><FieldInput value={email} onChange={setEmail} type="email" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Occupation"><FieldInput value={occ} onChange={setOcc} /></Field>
          <Field label="City"><FieldInput value={city} onChange={setCity} /></Field>
        </div>
      </ModalBody>
      <ModalFoot api={isEdit ? `PATCH /api/parents/${id}/` : 'POST /api/parents/'}>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn variant="blue" onClick={save} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
