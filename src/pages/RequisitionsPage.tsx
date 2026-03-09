import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useRequisitions, useRequisitionLogs, useInvalidate } from '@/hooks/useSupabaseData';
import { Card, Btn, Badge, Modal, ModalHead, ModalBody, ModalFoot, Field, FieldInput, FieldSelect, FieldTextarea, FilterSelect, SearchBar } from '@/components/SharedUI';
import { formatDate, formatDateTime, cap } from '@/data/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['Stationery', 'Maintenance', 'ICT Equipment', 'Vehicle/Transport', 'Resource Centre', 'Other'];
const URGENCIES = ['Normal', 'Urgent', 'Emergency'];
const EXECUTORS = ['Stationery Officer', 'Maintenance Officer', 'ICT Head', 'CFO', 'Resource Centre Admin'];
const DEPARTMENTS = ['Administration', 'Science', 'Mathematics', 'Languages', 'Humanities', 'ICT', 'Arts', 'Physical Education', 'Finance', 'Maintenance', 'Library', 'Other'];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  'Pending Departmental Review':            { bg: '#fff8c5', color: '#9a6700' },
  'Recommended by Departmental Reviewer':   { bg: '#ddf4ff', color: '#0969da' },
  'Submitted to Screening & Documentation Officer': { bg: '#ddf4ff', color: '#0969da' },
  'Submitted to Executive Approver':        { bg: '#f1f0ff', color: '#6e40c9' },
  'Approved - Action Pending':              { bg: '#dafbe1', color: '#1a7f37' },
  'Completed':                              { bg: '#dafbe1', color: '#1a7f37' },
  'Rejected':                               { bg: '#ffebe9', color: '#cf222e' },
};

const URGENCY_COLORS: Record<string, { bg: string; color: string }> = {
  Normal:    { bg: '#f6f8fa', color: '#656d76' },
  Urgent:    { bg: '#fff8c5', color: '#9a6700' },
  Emergency: { bg: '#ffebe9', color: '#cf222e' },
};

const STAGE_LABELS = ['Departmental Review', 'Screening & Documentation', 'Executive Approval'];

// ─── Role detection helpers ───────────────────────────────────────────────────

type ReqRole = 'requestor' | 'dept_reviewer' | 'screening_officer' | 'exec_approver' | 'admin';

function useReqRole(): ReqRole[] {
  const { roles, isAdmin } = useAuth();
  const result: ReqRole[] = [];
  if (isAdmin) result.push('admin');
  // Map existing app roles to req workflow roles
  // In practice, HOD = dept_reviewer, admin can also be any reviewer
  // These are configurable per-deployment via user_roles
  if (roles.includes('hod')) result.push('dept_reviewer');
  if (roles.includes('hoy')) result.push('screening_officer');
  if (isAdmin) result.push('exec_approver');
  // Everyone can be a requestor
  result.push('requestor');
  return result;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RequisitionsPage() {
  const { user, profile, isAdmin } = useAuth();
  const { showToast } = useApp();
  const invalidate = useInvalidate();
  const reqRoles = useReqRole();

  const { data: allReqs = [], isLoading } = useRequisitions();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [actionModal, setActionModal] = useState<{ req: any; action: 'approve' | 'review' | 'reject' | 'assign' | 'complete' } | null>(null);

  // RBAC filtering — requestors see only their own; reviewers see their stage
  const visibleReqs = useMemo(() => {
    return allReqs.filter((r: any) => {
      if (isAdmin) return true;
      if (reqRoles.includes('exec_approver') && r.current_stage === 3) return true;
      if (reqRoles.includes('screening_officer') && (r.current_stage === 2 || r.current_stage === 3)) return true;
      if (reqRoles.includes('dept_reviewer') && r.current_stage >= 1) return true;
      // Requestor sees their own
      return r.requestor_id === user?.id;
    });
  }, [allReqs, isAdmin, reqRoles, user?.id]);

  const filtered = useMemo(() => {
    return visibleReqs.filter((r: any) => {
      const s = search.toLowerCase();
      const matchSearch = !s || r.ref_number?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s) || r.requestor_name?.toLowerCase().includes(s) || r.department?.toLowerCase().includes(s);
      const matchStatus = !filterStatus || r.status === filterStatus;
      const matchCat = !filterCategory || r.category === filterCategory;
      const matchUrg = !filterUrgency || r.urgency === filterUrgency;
      return matchSearch && matchStatus && matchCat && matchUrg;
    });
  }, [visibleReqs, search, filterStatus, filterCategory, filterUrgency]);

  // Stats
  const stats = useMemo(() => ({
    total: visibleReqs.length,
    pending: visibleReqs.filter((r: any) => !['Completed', 'Rejected'].includes(r.status)).length,
    approved: visibleReqs.filter((r: any) => r.status === 'Approved - Action Pending' || r.status === 'Completed').length,
    rejected: visibleReqs.filter((r: any) => r.status === 'Rejected').length,
  }), [visibleReqs]);

  const allStatuses = [...new Set(allReqs.map((r: any) => r.status))] as string[] as string[];

  return (
    <div className="page-animate">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold"><i className="fas fa-file-invoice mr-2" />Requisitions</div>
        <Btn onClick={() => setShowForm(true)}><i className="fas fa-plus mr-1.5" />New Requisition</Btn>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total', value: stats.total, bg: '#ddf4ff', color: '#0969da', ico: 'fas fa-list' },
          { label: 'In Progress', value: stats.pending, bg: '#fff8c5', color: '#9a6700', ico: 'fas fa-hourglass-half' },
          { label: 'Approved', value: stats.approved, bg: '#dafbe1', color: '#1a7f37', ico: 'fas fa-check-circle' },
          { label: 'Rejected', value: stats.rejected, bg: '#ffebe9', color: '#cf222e', ico: 'fas fa-times-circle' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 p-4 rounded-lg border"
            style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))', boxShadow: 'var(--shadow)' }}>
            <div className="w-10 h-10 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
              <i className={s.ico} style={{ color: s.color, fontSize: '16px' }} />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono leading-none">{s.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by ref, description, requestor…">
          <FilterSelect value={filterStatus} onChange={setFilterStatus} allLabel="All Statuses"
            options={allStatuses.map(s => ({ value: s, label: s }))} />
          <FilterSelect value={filterCategory} onChange={setFilterCategory} allLabel="All Categories"
            options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <FilterSelect value={filterUrgency} onChange={setFilterUrgency} allLabel="All Urgencies"
            options={URGENCIES.map(u => ({ value: u, label: u }))} />
        </SearchBar>

        {isLoading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'hsl(var(--text3))' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm font-semibold">No requisitions found</div>
            <div className="text-xs mt-1" style={{ color: 'hsl(var(--text3))' }}>Submit a new requisition to get started</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr style={{ background: 'hsl(var(--surface2))', borderBottom: '2px solid hsl(var(--border))' }}>
                  {['Ref', 'Category', 'Description', 'Dept', 'Urgency', 'Date Required', 'Requestor', 'Status', 'Actions'].map(h => (
                    <th key={h} className="py-[9px] px-3 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => {
                  const sc = STATUS_COLORS[r.status] || { bg: '#f6f8fa', color: '#656d76' };
                  const uc = URGENCY_COLORS[r.urgency] || URGENCY_COLORS.Normal;
                  const canAct = canActOn(r, reqRoles, isAdmin, user?.id);
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f6f8fa' }}
                      className="hover:bg-[hsl(var(--surface2))] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] font-semibold" style={{ color: '#0969da' }}>
                        <button onClick={() => setDetail(r)} className="hover:underline bg-transparent border-none cursor-pointer p-0"
                          style={{ color: '#0969da', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>
                          {r.ref_number}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">{r.category}</td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate">{r.description}</td>
                      <td className="py-2.5 px-3 text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{r.department}</td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={uc}>{r.urgency}</span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{formatDate(r.date_required)}</td>
                      <td className="py-2.5 px-3 font-semibold text-[11px]">{r.requestor_name}</td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap" style={sc}>{r.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1">
                          <Btn variant="outline" size="sm" onClick={() => setDetail(r)}>
                            <i className="fas fa-eye" />
                          </Btn>
                          {canAct && r.status !== 'Completed' && r.status !== 'Rejected' && (
                            <Btn size="sm" onClick={() => setActionModal({ req: r, action: getDefaultAction(r, reqRoles, isAdmin) })}>
                              <i className="fas fa-tasks mr-1" />Act
                            </Btn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-[11px] mt-2" style={{ color: 'hsl(var(--text2))' }}>{filtered.length} requisition(s)</div>
          </div>
        )}
      </Card>

      {showForm && (
        <RequisitionForm
          profile={profile}
          userId={user?.id}
          onClose={() => { setShowForm(false); invalidate(['requisitions']); }}
        />
      )}

      {detail && (
        <RequisitionDetail
          req={detail}
          reqRoles={reqRoles}
          isAdmin={isAdmin}
          userId={user?.id}
          onAction={(req, action) => { setDetail(null); setActionModal({ req, action }); }}
          onClose={() => setDetail(null)}
        />
      )}

      {actionModal && (
        <ActionModal
          req={actionModal.req}
          action={actionModal.action}
          reqRoles={reqRoles}
          isAdmin={isAdmin}
          actorName={profile?.full_name || 'Unknown'}
          actorId={user?.id || ''}
          onClose={() => { setActionModal(null); invalidate(['requisitions', 'requisition_logs']); showToast('Action recorded'); }}
        />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function canActOn(req: any, reqRoles: ReqRole[], isAdmin: boolean, userId?: string): boolean {
  if (req.status === 'Completed' || req.status === 'Rejected') return false;
  if (isAdmin) return true;
  if (req.current_stage === 1 && reqRoles.includes('dept_reviewer')) return true;
  if (req.current_stage === 2 && reqRoles.includes('screening_officer')) return true;
  if (req.current_stage === 3 && reqRoles.includes('exec_approver')) return true;
  if (req.status === 'Approved - Action Pending' && isAdmin) return true;
  return false;
}

function getDefaultAction(req: any, reqRoles: ReqRole[], isAdmin: boolean): 'approve' | 'review' | 'reject' | 'assign' | 'complete' {
  if (req.status === 'Approved - Action Pending') return 'assign';
  return 'approve';
}

// ─── Requisition Form ─────────────────────────────────────────────────────────

function RequisitionForm({ profile, userId, onClose }: { profile: any; userId?: string; onClose: () => void }) {
  const { showToast } = useApp();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: 'Stationery',
    description: '',
    quantity: '1',
    estimated_cost: '',
    justification: '',
    date_required: '',
    department: '',
    urgency: 'Normal',
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = 'Required';
    if (!form.justification.trim()) e.justification = 'Required';
    if (!form.date_required) e.date_required = 'Required';
    if (!form.department) e.department = 'Required';
    if (!form.estimated_cost || isNaN(Number(form.estimated_cost))) e.estimated_cost = 'Enter a valid amount';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 1) e.quantity = 'Must be at least 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    let attachment_url = null;
    let attachment_name = null;

    if (file) {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { data: up, error: upErr } = await (supabase.storage as any).from('requisition-attachments').upload(path, file);
      if (upErr) { showToast(upErr.message, 'error'); setSaving(false); return; }
      const { data: { publicUrl } } = (supabase.storage as any).from('requisition-attachments').getPublicUrl(path);
      attachment_url = publicUrl;
      attachment_name = file.name;
    }

    const refNum = `REQ-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;

    const { data: req, error } = await (supabase as any).from('requisitions').insert({
      ref_number: refNum,
      requestor_id: userId,
      requestor_name: profile?.full_name || 'Unknown',
      category: form.category,
      description: form.description.trim(),
      quantity: parseInt(form.quantity),
      estimated_cost: parseFloat(form.estimated_cost),
      justification: form.justification.trim(),
      date_required: form.date_required,
      department: form.department,
      urgency: form.urgency,
      attachment_url,
      attachment_name,
      status: 'Pending Departmental Review',
      current_stage: 1,
    }).select().single();

    if (error) { showToast(error.message, 'error'); setSaving(false); return; }

    // Log
    await (supabase as any).from('requisition_logs').insert({
      requisition_id: req.id,
      actor_id: userId,
      actor_name: profile?.full_name || 'Unknown',
      action: 'submitted',
      stage: 1,
      note: 'Requisition submitted',
    });

    showToast(`Requisition ${refNum} submitted`);
    onClose();
  };

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title="New Requisition" onClose={onClose} />
      <ModalBody>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" required>
            <FieldSelect value={form.category} onChange={v => set('category', v)}
              options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          </Field>
          <Field label="Department" required error={errors.department}>
            <FieldSelect value={form.department} onChange={v => set('department', v)}
              options={[{ value: '', label: '— Select Department —' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]}
              hasError={!!errors.department} />
          </Field>
        </div>

        <Field label="Item / Service Description" required error={errors.description}>
          <FieldInput value={form.description} onChange={v => set('description', v)}
            placeholder="Describe the item or service needed" hasError={!!errors.description} />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Quantity" required error={errors.quantity}>
            <FieldInput value={form.quantity} onChange={v => set('quantity', v)}
              type="number" placeholder="1" hasError={!!errors.quantity} />
          </Field>
          <Field label="Estimated Cost (BWP)" required error={errors.estimated_cost}>
            <FieldInput value={form.estimated_cost} onChange={v => set('estimated_cost', v)}
              type="number" placeholder="0.00" hasError={!!errors.estimated_cost} />
          </Field>
          <Field label="Date Required" required error={errors.date_required}>
            <FieldInput value={form.date_required} onChange={v => set('date_required', v)}
              type="date" hasError={!!errors.date_required} />
          </Field>
        </div>

        <Field label="Urgency Level" required>
          <div className="flex gap-2">
            {URGENCIES.map(u => {
              const c = URGENCY_COLORS[u];
              const selected = form.urgency === u;
              return (
                <button key={u} onClick={() => set('urgency', u)}
                  className="flex-1 py-2 rounded-md text-[12px] font-semibold border transition-all cursor-pointer"
                  style={{
                    background: selected ? c.bg : 'hsl(var(--surface2))',
                    color: selected ? c.color : 'hsl(var(--text2))',
                    borderColor: selected ? c.color : 'hsl(var(--border))',
                  }}>
                  {u === 'Emergency' && <i className="fas fa-exclamation-triangle mr-1" />}
                  {u === 'Urgent' && <i className="fas fa-clock mr-1" />}
                  {u === 'Normal' && <i className="fas fa-circle mr-1" />}
                  {u}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Reason / Justification" required error={errors.justification}>
          <FieldTextarea value={form.justification} onChange={v => set('justification', v)}
            placeholder="Explain why this requisition is needed…" minHeight="90px" />
        </Field>

        <Field label="Supporting Documents (Optional)">
          <div className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors"
            style={{ borderColor: file ? '#1a7f37' : 'hsl(var(--border))', background: file ? '#dafbe1' : 'hsl(var(--surface2))' }}
            onClick={() => document.getElementById('req-file-input')?.click()}>
            <input id="req-file-input" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.png,.xlsx"
              onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div className="text-[12px] font-semibold" style={{ color: '#1a7f37' }}>
                <i className="fas fa-check-circle mr-1.5" />{file.name}
                <button className="ml-2 text-[10px]" style={{ color: '#cf222e' }} onClick={e => { e.stopPropagation(); setFile(null); }}>Remove</button>
              </div>
            ) : (
              <div style={{ color: 'hsl(var(--text3))' }}>
                <i className="fas fa-paperclip text-xl mb-1 block" />
                <div className="text-[12px]">Click to attach a file</div>
                <div className="text-[10px] mt-0.5">PDF, Word, Excel, Image — max 10MB</div>
              </div>
            )}
          </div>
        </Field>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Requisition'}</Btn>
      </ModalFoot>
    </Modal>
  );
}

// ─── Requisition Detail ───────────────────────────────────────────────────────

function RequisitionDetail({ req, reqRoles, isAdmin, userId, onAction, onClose }: any) {
  const { data: logs = [] } = useRequisitionLogs(req.id);

  const sc = STATUS_COLORS[req.status] || { bg: '#f6f8fa', color: '#656d76' };
  const uc = URGENCY_COLORS[req.urgency] || URGENCY_COLORS.Normal;
  const canAct = canActOn(req, reqRoles, isAdmin, userId);

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHead title={req.ref_number} onClose={onClose} />
      <ModalBody>
        {/* Progress stepper */}
        <div className="mb-5 p-4 rounded-lg" style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-4 h-0.5" style={{ background: 'hsl(var(--border))', zIndex: 0, margin: '0 40px' }} />
            {STAGE_LABELS.map((label, i) => {
              const stageNum = i + 1;
              const done = req.status === 'Completed' || req.status === 'Approved - Action Pending' || req.current_stage > stageNum || (req.current_stage === stageNum && req.status !== 'Rejected' && req.current_stage > i + 1);
              const active = req.current_stage === stageNum && !['Completed', 'Rejected', 'Approved - Action Pending'].includes(req.status);
              const rejected = req.status === 'Rejected';

              let bg = '#f6f8fa', color = '#656d76', border = '#d1d9e0';
              if (rejected && req.current_stage === stageNum) { bg = '#ffebe9'; color = '#cf222e'; border = '#f1a7a1'; }
              else if (active) { bg = '#ddf4ff'; color = '#0969da'; border = '#0969da'; }
              else if (req.current_stage > stageNum || ['Completed', 'Approved - Action Pending'].includes(req.status)) { bg = '#dafbe1'; color = '#1a7f37'; border = '#aceebb'; }

              return (
                <div key={label} className="flex flex-col items-center z-10" style={{ width: '33%' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 mb-1.5"
                    style={{ background: bg, color, borderColor: border }}>
                    {req.current_stage > stageNum || ['Completed', 'Approved - Action Pending'].includes(req.status) ? <i className="fas fa-check" /> : stageNum}
                  </div>
                  <div className="text-[10px] font-semibold text-center" style={{ color }}>{label}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-center">
            <span className="rounded-md px-3 py-1 text-[11px] font-semibold" style={sc}>{req.status}</span>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-8 mb-4">
          {[
            ['Category', req.category],
            ['Department', req.department],
            ['Quantity', req.quantity],
            ['Estimated Cost', `BWP ${Number(req.estimated_cost).toLocaleString()}`],
            ['Date Required', formatDate(req.date_required)],
            ['Urgency', null],
            ['Requestor', req.requestor_name],
            ['Submitted', formatDateTime(req.created_at)],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between py-[6px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
              <span style={{ color: 'hsl(var(--text2))' }}>{label}</span>
              {label === 'Urgency' ? (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={uc}>{req.urgency}</span>
              ) : (
                <span className="font-medium text-right">{value || '—'}</span>
              )}
            </div>
          ))}
        </div>

        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: 'hsl(var(--text2))' }}>Description</div>
          <div className="text-[12.5px] p-3 rounded-md" style={{ background: 'hsl(var(--surface2))' }}>{req.description}</div>
        </div>

        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: 'hsl(var(--text2))' }}>Justification</div>
          <div className="text-[12.5px] p-3 rounded-md" style={{ background: 'hsl(var(--surface2))' }}>{req.justification}</div>
        </div>

        {req.attachment_url && (
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase mb-1" style={{ color: 'hsl(var(--text2))' }}>Attachment</div>
            <a href={req.attachment_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 rounded-md text-[12px] font-semibold"
              style={{ background: '#ddf4ff', color: '#0969da', border: '1px solid #b6d5f7', textDecoration: 'none' }}>
              <i className="fas fa-paperclip" />{req.attachment_name || 'View Attachment'}
            </a>
          </div>
        )}

        {req.executor && (
          <div className="mb-3 rounded-md px-3 py-2" style={{ background: '#dafbe1', border: '1px solid #aceebb' }}>
            <div className="text-[10px] font-bold uppercase mb-1" style={{ color: '#1a7f37' }}>Assigned Executor</div>
            <div className="text-[12.5px] font-semibold" style={{ color: '#1a7f37' }}>{req.executor}</div>
          </div>
        )}

        {req.rejection_reason && (
          <div className="mb-3 rounded-md px-3 py-2" style={{ background: '#ffebe9', border: '1px solid #f1a7a1' }}>
            <div className="text-[10px] font-bold uppercase mb-1" style={{ color: '#cf222e' }}>Rejection Reason</div>
            <div className="text-[12.5px]" style={{ color: '#cf222e' }}>{req.rejection_reason}</div>
          </div>
        )}

        {/* Audit trail */}
        {logs.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-bold uppercase mb-2" style={{ color: 'hsl(var(--text2))' }}>
              <i className="fas fa-history mr-1" />Activity Log
            </div>
            <div className="space-y-2">
              {logs.map((log: any) => {
                const actionColors: Record<string, { bg: string; color: string }> = {
                  submitted: { bg: '#ddf4ff', color: '#0969da' },
                  approved: { bg: '#dafbe1', color: '#1a7f37' },
                  reviewed: { bg: '#fff8c5', color: '#9a6700' },
                  rejected: { bg: '#ffebe9', color: '#cf222e' },
                  assigned: { bg: '#f1f0ff', color: '#6e40c9' },
                  completed: { bg: '#dafbe1', color: '#1a7f37' },
                };
                const ac = actionColors[log.action] || { bg: '#f6f8fa', color: '#656d76' };
                return (
                  <div key={log.id} className="flex gap-3 items-start text-[12px]">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={ac}>
                      {log.actor_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{log.actor_name}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={ac}>{cap(log.action)}</span>
                        {log.stage && <span className="text-[10px]" style={{ color: 'hsl(var(--text3))' }}>Stage {log.stage}</span>}
                      </div>
                      {log.note && <div className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{log.note}</div>}
                      <div className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text3))' }}>{formatDateTime(log.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Close</Btn>
        {canAct && req.status !== 'Completed' && req.status !== 'Rejected' && (
          <div className="flex gap-2">
            {req.status === 'Approved - Action Pending' ? (
              <Btn onClick={() => onAction(req, 'assign')}><i className="fas fa-user-check mr-1" />Assign Executor</Btn>
            ) : (
              <>
                <Btn variant="danger" onClick={() => onAction(req, 'reject')}>
                  <i className="fas fa-times mr-1" />Reject
                </Btn>
                <Btn variant="outline" onClick={() => onAction(req, 'review')}>
                  <i className="fas fa-undo mr-1" />Send Back
                </Btn>
                <Btn onClick={() => onAction(req, req.current_stage === 3 ? 'approve' : 'approve')}>
                  <i className="fas fa-check mr-1" />{req.current_stage === 3 ? 'Final Approve' : 'Approve'}
                </Btn>
              </>
            )}
          </div>
        )}
        {canAct && req.status === 'Approved - Action Pending' && req.executor && (
          <Btn onClick={() => onAction(req, 'complete')}><i className="fas fa-flag-checkered mr-1" />Mark Complete</Btn>
        )}
      </ModalFoot>
    </Modal>
  );
}

// ─── Action Modal ─────────────────────────────────────────────────────────────

function ActionModal({ req, action, reqRoles, isAdmin, actorName, actorId, onClose }: any) {
  const [note, setNote] = useState('');
  const [executor, setExecutor] = useState('');
  const [saving, setSaving] = useState(false);

  const STAGE_STATUS_MAP: Record<number, { approve: string; review: string }> = {
    1: { approve: 'Submitted to Screening & Documentation Officer', review: 'Pending Departmental Review' },
    2: { approve: 'Submitted to Executive Approver', review: 'Recommended by Departmental Reviewer' },
    3: { approve: 'Approved - Action Pending', review: 'Submitted to Screening & Documentation Officer' },
  };

  const titles: Record<string, string> = {
    approve: req.current_stage === 3 ? 'Final Approval' : 'Approve & Advance',
    review: 'Send Back for Review',
    reject: 'Reject Requisition',
    assign: 'Assign Executor',
    complete: 'Mark as Completed',
  };

  const submit = async () => {
    setSaving(true);
    let newStatus = req.status;
    let newStage = req.current_stage;
    let logAction = action;

    if (action === 'approve') {
      const map = STAGE_STATUS_MAP[req.current_stage];
      newStatus = map.approve;
      if (req.current_stage < 3) newStage = req.current_stage + 1;
      logAction = 'approved';
    } else if (action === 'review') {
      const map = STAGE_STATUS_MAP[req.current_stage];
      newStatus = map.review;
      if (req.current_stage > 1) newStage = req.current_stage - 1;
      logAction = 'reviewed';
    } else if (action === 'reject') {
      newStatus = 'Rejected';
      logAction = 'rejected';
    } else if (action === 'assign') {
      if (!executor) { setSaving(false); return; }
      logAction = 'assigned';
    } else if (action === 'complete') {
      newStatus = 'Completed';
      logAction = 'completed';
    }

    const updateData: any = { status: newStatus, current_stage: newStage, updated_at: new Date().toISOString() };
    if (action === 'reject') updateData.rejection_reason = note;
    if (action === 'review') updateData.review_note = note;
    if (action === 'assign') updateData.executor = executor;

    const { error } = await (supabase as any).from('requisitions').update(updateData).eq('id', req.id);
    if (error) { setSaving(false); return; }

    await (supabase as any).from('requisition_logs').insert({
      requisition_id: req.id,
      actor_id: actorId,
      actor_name: actorName,
      action: logAction,
      stage: req.current_stage,
      note: note || (action === 'assign' ? `Assigned to: ${executor}` : null),
    });

    setSaving(false);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title={titles[action]} onClose={onClose} />
      <ModalBody>
        <div className="rounded-md px-3 py-2 mb-3 text-[12px]"
          style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}>
          <div className="font-semibold">{req.ref_number}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{req.description}</div>
        </div>

        {action === 'approve' && (
          <div className="rounded-md px-3 py-2.5 mb-3 text-[12px]" style={{ background: '#dafbe1', border: '1px solid #aceebb', color: '#1a7f37' }}>
            <i className="fas fa-arrow-right mr-1.5" />
            {req.current_stage === 3
              ? 'This will set the status to "Approved - Action Pending"'
              : `This will advance to Stage ${req.current_stage + 1}: ${STAGE_LABELS[req.current_stage]}`}
          </div>
        )}

        {action === 'review' && (
          <div className="rounded-md px-3 py-2.5 mb-3 text-[12px]" style={{ background: '#fff8c5', border: '1px solid #ffe07c', color: '#9a6700' }}>
            <i className="fas fa-undo mr-1.5" />
            This will send the requisition back to {req.current_stage > 1 ? STAGE_LABELS[req.current_stage - 2] : 'the Requestor'} for corrections
          </div>
        )}

        {action === 'reject' && (
          <div className="rounded-md px-3 py-2.5 mb-3 text-[12px]" style={{ background: '#ffebe9', border: '1px solid #f1a7a1', color: '#cf222e' }}>
            <i className="fas fa-times-circle mr-1.5" />This action is permanent. The requisition will be closed.
          </div>
        )}

        {action === 'assign' && (
          <Field label="Assign Executor" required>
            <FieldSelect value={executor} onChange={setExecutor}
              options={[{ value: '', label: '— Select Executor —' }, ...EXECUTORS.map(e => ({ value: e, label: e }))]} />
          </Field>
        )}

        {(action === 'review' || action === 'reject') && (
          <Field label={action === 'reject' ? 'Rejection Reason' : 'Review Notes'} required>
            <FieldTextarea value={note} onChange={setNote}
              placeholder={action === 'reject' ? 'Explain why this requisition is rejected…' : 'Explain what needs to be corrected…'}
              minHeight="80px" />
          </Field>
        )}

        {action === 'approve' && (
          <Field label="Additional Notes (Optional)">
            <FieldTextarea value={note} onChange={setNote} placeholder="Any notes for the next reviewer…" minHeight="60px" />
          </Field>
        )}

        {action === 'complete' && (
          <Field label="Completion Notes (Optional)">
            <FieldTextarea value={note} onChange={setNote} placeholder="Any notes about completion…" minHeight="60px" />
          </Field>
        )}
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn
          variant={action === 'reject' ? 'danger' : 'primary'}
          onClick={submit}
          disabled={saving || ((action === 'reject' || action === 'review') && !note.trim()) || (action === 'assign' && !executor)}>
          {saving ? 'Saving…' : action === 'approve' ? 'Confirm Approval' : action === 'review' ? 'Send Back' : action === 'reject' ? 'Reject' : action === 'assign' ? 'Assign' : 'Mark Complete'}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}
