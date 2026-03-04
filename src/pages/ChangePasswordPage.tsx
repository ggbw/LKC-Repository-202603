import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export default function ChangePasswordPage() {
  const { profile, refreshProfile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) { setError(err.message); setLoading(false); return; }
    // Update must_change_password flag
    if (profile) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', profile.id);
    }
    await refreshProfile();
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)' }}>
      <div className="w-full max-w-[400px] mx-4">
        <div className="text-center mb-6">
          <img src="/images/lkc-logo.jpeg" alt="LKC Logo" className="w-20 h-20 rounded-full border-4 mx-auto mb-3" style={{ borderColor: '#2ea043' }} />
          <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>Change Your Password</h1>
          <p className="text-xs mt-1" style={{ color: '#8b949e' }}>You must set a new password before continuing</p>
        </div>
        <div className="rounded-xl p-8" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#3d1a1a', border: '1px solid #cf222e', color: '#ff7b72' }}>{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8b949e' }}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8b949e' }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #2ea043, #238636)', color: '#fff', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Updating...' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
