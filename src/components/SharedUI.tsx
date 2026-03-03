import React from 'react';
import { useApp } from '@/context/AppContext';
import { badgeClass, cap } from '@/data/database';

// Reusable Badge component
export function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${badgeClass(status)}`}>{cap(status)}</span>;
}

// Reusable stat card
export function StatCard({ icon, bg, value, label, sub, subColor }: {
  icon: string; bg: string; value: string | number; label: string; sub?: string; subColor?: string;
}) {
  return (
    <div className="flex items-center gap-3.5 p-4 rounded-lg border" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))', boxShadow: 'var(--shadow)' }}>
      <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0" style={{ background: bg }}>{icon}</div>
      <div>
        <div className="text-2xl font-bold leading-none font-mono">{value}</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text2))' }}>{label}</div>
        {sub && <div className="text-[10px] mt-0.5 font-medium" style={{ color: subColor || 'hsl(var(--text2))' }}>{sub}</div>}
      </div>
    </div>
  );
}

// Card wrapper
export function Card({ children, title, titleRight, className = '', style }: {
  children: React.ReactNode; title?: string; titleRight?: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div className={`rounded-lg border p-5 ${className}`} style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))', boxShadow: 'var(--shadow)', ...style }}>
      {title && (
        <div className="text-[13px] font-semibold mb-3.5 flex items-center justify-between" style={{ color: 'hsl(var(--text))' }}>
          {title}
          {titleRight}
        </div>
      )}
      {children}
    </div>
  );
}

// Countdown tag
export function CountdownTag({ assignment }: { assignment: { due_date: string; state: string } }) {
  if (assignment.state === 'closed') return <span className="countdown closed">Closed</span>;
  const d = Math.ceil((new Date(assignment.due_date).getTime() - new Date().getTime()) / 86400000);
  if (d < 0) return <span className="countdown overdue-tag">⚠ Overdue {Math.abs(d)}d</span>;
  if (d === 0) return <span className="countdown urgent">Due today!</span>;
  if (d <= 2) return <span className="countdown urgent">Due in {d}d</span>;
  if (d <= 5) return <span className="countdown soon">Due in {d}d</span>;
  return <span className="countdown ok">Due in {d}d</span>;
}

// Info row for detail views
export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-[7px] text-[12.5px]" style={{ borderBottom: '1px solid #f6f8fa' }}>
      <span style={{ color: 'hsl(var(--text2))' }}>{label}</span>
      <span className="font-medium text-right max-w-[55%]">{value}</span>
    </div>
  );
}

// Search bar
export function SearchBar({ value, onChange, placeholder, children }: {
  value: string; onChange: (v: string) => void; placeholder: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5 mb-4 flex-wrap">
      <input
        className="flex-1 min-w-[200px] border rounded-md py-[7px] px-3 text-[12.5px] outline-none font-sans transition-colors"
        style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface2))' }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { e.currentTarget.style.borderColor = '#1f6feb'; e.currentTarget.style.background = 'hsl(var(--surface))'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.background = 'hsl(var(--surface2))'; }}
      />
      {children}
    </div>
  );
}

// Filter select
export function FilterSelect({ value, onChange, options, allLabel }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; allLabel: string;
}) {
  return (
    <select
      className="border rounded-md py-[7px] px-2.5 text-xs outline-none font-sans cursor-pointer"
      style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface2))', color: 'hsl(var(--text))' }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{allLabel}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// GradeChip
export function GradeChip({ grade }: { grade: string }) {
  const c: Record<string, string> = {'A*':'gas','A':'ga','B':'gb','C':'gc','D':'gd','E':'ge','U':'gu'};
  return <span className={`grade ${c[grade] || 'gu'}`}>{grade}</span>;
}

// Back button
export function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-none bg-transparent p-0 mb-4 font-sans" style={{ color: '#1f6feb' }}>
      ← {label}
    </button>
  );
}

// Btn components
export function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', style }: {
  children: React.ReactNode; variant?: 'primary' | 'blue' | 'purple' | 'outline' | 'danger';
  size?: 'sm' | 'md'; onClick?: () => void; disabled?: boolean; className?: string; style?: React.CSSProperties;
}) {
  const base = 'border-none rounded-md font-semibold cursor-pointer font-sans transition-all inline-flex items-center gap-1.5';
  const sz = size === 'sm' ? 'py-1 px-2.5 text-[11px]' : 'py-[7px] px-3.5 text-xs';
  const vars: Record<string, string> = {
    primary: 'bg-[#2ea043] text-white hover:bg-[#238636]',
    blue: 'bg-[#1f6feb] text-white hover:bg-[#1158c7]',
    purple: 'bg-[#8250df] text-white hover:bg-[#6e40c9]',
    danger: 'bg-[#f85149] text-white hover:bg-[#d1302f]',
    outline: 'bg-transparent border border-solid text-[hsl(var(--text2))] hover:bg-[hsl(var(--surface2))]',
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${sz} ${vars[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      style={{ borderColor: variant === 'outline' ? 'hsl(var(--border))' : undefined, ...style }}>
      {children}
    </button>
  );
}

// Modal wrapper
export function Modal({ children, onClose, size = 'md' }: {
  children: React.ReactNode; onClose: () => void; size?: 'sm' | 'md' | 'lg';
}) {
  const w = size === 'sm' ? 'max-w-[440px]' : size === 'lg' ? 'max-w-[800px]' : 'max-w-[620px]';
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${w} w-full max-h-[90vh] flex flex-col rounded-xl`} style={{ background: 'hsl(var(--surface))', boxShadow: '0 24px 64px rgba(0,0,0,.25)' }}>
        {children}
      </div>
    </div>
  );
}

export function ModalHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="px-6 pt-5 flex justify-between items-center flex-shrink-0">
      <div className="text-base font-bold">{title}</div>
      <button onClick={onClose} className="bg-transparent border-none text-[22px] cursor-pointer leading-none p-0" style={{ color: 'hsl(var(--text2))' }}>×</button>
    </div>
  );
}

export function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-[18px] overflow-y-auto flex-1">{children}</div>;
}

export function ModalFoot({ api, children }: { api?: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-3.5 flex justify-between items-center flex-shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
      {api ? <div className="text-[10px] font-mono" style={{ color: 'hsl(var(--text3))' }}>{api}</div> : <div />}
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

// Form field helpers
export function FormSection({ title }: { title: string }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wider mt-3.5 mb-2.5 pb-1 first:mt-0" style={{ color: 'hsl(var(--text3))', borderBottom: '1px solid hsl(var(--border))' }}>
      {title}
    </div>
  );
}

export function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'hsl(var(--text2))' }}>
        {label} {required && <span style={{ color: '#f85149' }}>*</span>}
      </label>
      {children}
      {error && <div className="text-[10px] mt-0.5" style={{ color: '#f85149' }}>{error}</div>}
    </div>
  );
}

export function FieldInput({ value, onChange, type = 'text', placeholder, readOnly, hasError, ...rest }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
  readOnly?: boolean; hasError?: boolean; [key: string]: any;
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} readOnly={readOnly}
      className="w-full border rounded-md py-2 px-2.5 text-[12.5px] font-sans outline-none transition-colors"
      style={{
        borderColor: hasError ? '#f85149' : 'hsl(var(--border))',
        background: readOnly ? '#f6f8fa' : 'hsl(var(--surface2))',
        color: readOnly ? 'hsl(var(--text2))' : 'hsl(var(--text))',
        cursor: readOnly ? 'default' : undefined,
      }}
      {...rest}
    />
  );
}

export function FieldSelect({ value, onChange, options, hasError }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hasError?: boolean;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full border rounded-md py-2 px-2.5 text-[12.5px] font-sans outline-none cursor-pointer"
      style={{ borderColor: hasError ? '#f85149' : 'hsl(var(--border))', background: 'hsl(var(--surface2))', color: 'hsl(var(--text))' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function FieldTextarea({ value, onChange, placeholder, minHeight = '70px' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; minHeight?: string;
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border rounded-md py-2 px-2.5 text-[12.5px] font-sans outline-none resize-y"
      style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface2))', color: 'hsl(var(--text))', minHeight }}
    />
  );
}

// Delete confirmation modal
export function DeleteModal({ title, message, warning, api, onClose, onConfirm }: {
  title: string; message: string; warning?: string; api?: string;
  onClose: () => void; onConfirm: () => void;
}) {
  return (
    <Modal onClose={onClose} size="sm">
      <ModalBody>
        <div className="text-center py-4">
          <div className="text-[40px] mb-2.5">🗑️</div>
          <div className="text-[15px] font-bold mb-1.5">{title}</div>
          <div className="text-xs" style={{ color: 'hsl(var(--text2))' }}>{message}</div>
          {warning && (
            <div className="mt-2.5 rounded-md px-3 py-2 text-[11px] font-semibold" style={{ background: '#fff8c5', border: '1px solid #ffe07c', color: '#9a6700' }}>
              {warning}
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFoot api={api}>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" onClick={onConfirm}>Delete</Btn>
      </ModalFoot>
    </Modal>
  );
}
