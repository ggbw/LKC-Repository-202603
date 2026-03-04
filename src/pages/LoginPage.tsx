import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)' }}>
      <div className="w-full max-w-[400px] mx-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/images/lkc-logo.jpeg" alt="LKC Logo" className="w-28 h-28 rounded-full border-4" style={{ borderColor: '#2ea043' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#e6edf3' }}>Livingstone Kolobeng College</h1>
          <p className="text-sm mt-1" style={{ color: '#8b949e' }}>Thuto ke botshelo</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl p-8" style={{ background: '#161b22', border: '1px solid #30363d', boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
          <h2 className="text-lg font-semibold mb-6 text-center" style={{ color: '#e6edf3' }}>Sign In</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#3d1a1a', border: '1px solid #cf222e', color: '#ff7b72' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8b949e' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@lkc.ac.bw"
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8b949e' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #2ea043, #238636)', color: '#fff', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 text-center" style={{ borderTop: '1px solid #21262d' }}>
            <a href="/admission" className="text-xs font-medium" style={{ color: '#58a6ff' }}>
              Apply for Admission →
            </a>
          </div>
        </div>

        <p className="text-center text-[10px] mt-6" style={{ color: '#484f58' }}>
          © 2026 Livingstone Kolobeng College · School Management System
        </p>
      </div>
    </div>
  );
}
