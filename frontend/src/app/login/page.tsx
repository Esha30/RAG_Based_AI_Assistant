'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Sparkles, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', borderRadius: 18, marginBottom: 16, boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}>
            <Sparkles size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Outfit,sans-serif', marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Sign in to your AI Document Assistant
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: '36px 32px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              <AlertCircle size={16} color="#ef4444" />
              <span style={{ fontSize: 13, color: '#ef4444' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: 40 }}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Don&apos;t have an account? </span>
            <Link href="/register" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              Create one →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
