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
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error: err } = await supabase.from('admission_enquiries').insert([form]);
    if (err) { setError(err.message); return; }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)' }}>
        <div className="text-center max-w-md mx-4 p-8 rounded-xl" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#e6edf3' }}>Application Submitted!</h2>
          <p className="text-sm mb-4" style={{ color: '#8b949e' }}>Thank you for applying to Livingstone Kolobeng College. We will review your application and get back to you soon.</p>
          <a href="/" className="text-sm font-medium" style={{ color: '#58a6ff' }}>← Back to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <img src="/images/lkc-logo.jpeg" alt="LKC Logo" className="w-20 h-20 rounded-full border-4 mx-auto mb-3" style={{ borderColor: '#2ea043' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#e6edf3' }}>Admission Enquiry</h1>
          <p className="text-sm" style={{ color: '#8b949e' }}>Livingstone Kolobeng College</p>
        </div>

        <div className="rounded-xl p-8" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#3d1a1a', border: '1px solid #cf222e', color: '#ff7b72' }}>{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Student Full Name *</label>
                <input required value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Gender</label>
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }}>
                  <option value="">Select</option><option>Male</option><option>Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Nationality</label>
                <input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Form Applying For *</label>
                <select required value={form.form_applying} onChange={e => setForm(f => ({ ...f, form_applying: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }}>
                  {FORMS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Parent / Guardian Name *</label>
                <input required value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Parent Email</label>
                <input type="email" value={form.parent_email} onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Parent Phone</label>
                <input value={form.parent_phone} onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Previous School</label>
                <input value={form.previous_school} onChange={e => setForm(f => ({ ...f, previous_school: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} />
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #2ea043, #238636)', color: '#fff' }}>
              Submit Application
            </button>
          </form>
          <div className="mt-4 text-center">
            <a href="/" className="text-xs" style={{ color: '#58a6ff' }}>← Back to Login</a>
          </div>
        </div>
      </div>
    </div>
  );
}
