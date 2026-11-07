import React, { useState } from 'react';
import { Check, Sun, Moon } from 'lucide-react';
import { login } from '../api';

export default function LoginPage({ onLoginSuccess, theme, onToggleTheme, apiBase }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const user = await login(apiBase, username, password);
      onLoginSuccess(user);
    } catch (loginError) {
      setError(loginError.message || 'Login gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-main)',
      position: 'relative'
    }}>
      {/* Theme Toggle Top-Right */}
      <button
        onClick={onToggleTheme}
        className="btn-secondary"
        style={{ position: 'absolute', top: '24px', right: '24px', padding: '6px 12px', fontSize: '0.8125rem' }}
      >
        {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#0284c7" />}
        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      <div style={{
        maxWidth: '850px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        {/* Left Info Panel */}
        <div style={{
          padding: '40px',
          background: 'var(--bg-subtle)',
          borderRight: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--primary)', padding: '6px 10px', borderRadius: '6px', color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>
                ANCHOR VI
              </div>
              <span className="badge badge-neutral">ASEAN NCAP Research</span>
            </div>

            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3, marginBottom: '12px' }}>
              Traffic Accident Video Analysis System
            </h1>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '24px' }}>
              Identification and classification of critical motorcycle-car and car-car crash scenarios using computer vision.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-body)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={14} color="var(--primary)" /> Universitas Andalas & UMPSA Malaysia
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={14} color="var(--primary)" /> ASEAN Traffic Crash Database
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={14} color="var(--primary)" /> 13 Telemetry Variables Extraction
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            Project Leader: Dr. Eng. Lusi Susanti (2026 - 2027)
          </div>
        </div>

        {/* Right Login Form */}
        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>Sign In</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '24px' }}>Login diverifikasi oleh backend ANCHOR VI.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p role="alert" style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '12px' }}>{error}</p>}

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
