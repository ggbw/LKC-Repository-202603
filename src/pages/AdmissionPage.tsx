import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FORMS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6', 'Form 7'];

export default function AdmissionPage() {
  const [form, setForm] = useState({
    student_name: '', date_of_birth: '', gender: '', nationality: '',
    parent_name: '', parent_email: '', parent_phone: '',
    form_applying: 'Form 1', previous_school: '', notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const { error: err } = await supabase.from('admission_enquiries').insert([form]);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSubmitted(true);
  };

  const inputStyle = {
    background: '#0d1117',
    border: '1px solid #30363d',
    color: '#e6edf3',
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 500,
    color: '#8b949e',
    marginBottom: '4px',
  };

  // Use a fixed-position full-screen overlay so App.css #root styles can't interfere
  const pageStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    overflowY: 'auto',
    background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
    zIndex: 9999,
  };

  if (submitted) {
    return (
      <div style={pageStyle}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ textAlign: 'center', maxWidth: '420px', width: '100%', padding: '40px 32px', borderRadius: '16px', background: '#161b22', border: '1px solid #30363d' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: '#e6edf3', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Application Submitted!</h2>
            <p style={{ color: '#8b949e', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
              Thank you for applying to Livingstone Kolobeng College. We will review your application and contact you soon.
            </p>
            <a href="/" style={{ color: '#58a6ff', fontSize: '13px', textDecoration: 'none' }}>← Back to Login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 16px 60px' }}>

        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/images/lkc-logo.jpeg" alt="LKC Logo" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #2ea043', margin: '0 auto 12px' }} />
          <h1 style={{ color: '#e6edf3', fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Admission Enquiry</h1>
          <p style={{ color: '#8b949e', fontSize: '13px' }}>Livingstone Kolobeng College</p>
        </div>

        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '32px' }}>
          {error && (
            <div style={{ background: '#3d1a1a', border: '1px solid #cf222e', color: '#ff7b72', borderRadius: '8px', padding: '12px', fontSize: '13px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ── Student section ── */}
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#58a6ff', borderBottom: '1px solid #21262d', paddingBottom: '8px', marginBottom: '16px' }}>
              Student Information
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Student Full Name *</label>
              <input required style={inputStyle} value={form.student_name}
                onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input type="date" style={inputStyle} value={form.date_of_birth}
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <select style={inputStyle} value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nationality</label>
                <input style={inputStyle} value={form.nationality}
                  onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Form Applying For *</label>
                <select required style={inputStyle} value={form.form_applying}
                  onChange={e => setForm(f => ({ ...f, form_applying: e.target.value }))}>
                  {FORMS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Previous School</label>
              <input style={inputStyle} value={form.previous_school}
                onChange={e => setForm(f => ({ ...f, previous_school: e.target.value }))} />
            </div>

            {/* ── Parent section ── */}
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#58a6ff', borderBottom: '1px solid #21262d', paddingBottom: '8px', marginBottom: '16px' }}>
              Parent / Guardian Information
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Parent / Guardian Full Name *</label>
              <input required style={inputStyle} value={form.parent_name}
                onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Parent Email</label>
                <input type="email" style={inputStyle} value={form.parent_email}
                  onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Parent Phone</label>
                <input style={inputStyle} value={form.parent_phone}
                  onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))} />
              </div>
            </div>

            {/* ── Notes ── */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Additional Notes</label>
              <textarea rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' }}
                value={form.notes} placeholder="Any additional information..."
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <button type="submit" disabled={saving} style={{
              width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #2ea043, #238636)', color: '#fff',
              fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s',
            }}>
              {saving ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <a href="/" style={{ color: '#58a6ff', fontSize: '12px', textDecoration: 'none' }}>← Back to Login</a>
          </div>
        </div>
      </div>
    </div>
  );
}
