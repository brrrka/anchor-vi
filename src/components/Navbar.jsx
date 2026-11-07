import React from 'react';
import { Server, Upload, LogOut, Sun, Moon, RefreshCw } from 'lucide-react';

export default function Navbar({ user, serverConfig, theme, onToggleTheme, onOpenServerConfig, onOpenUploadModal, onLogout, uploadState, onNavigateToUpload }) {
  return (
    <header style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-light)',
      padding: '12px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'background-color 0.2s ease, border-color 0.2s ease'
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'var(--primary)', color: '#ffffff', padding: '6px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.875rem' }}>
          ANCHOR VI
        </div>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.2 }}>
            ASEAN NCAP Traffic Accident Dashboard
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Universitas Andalas & UMPSA Malaysia Research
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="btn-secondary"
          style={{ padding: '6px 10px', fontSize: '0.8125rem' }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#0284c7" />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {/* Server Status Trigger */}
        <button
          onClick={onOpenServerConfig}
          className="btn-secondary"
          style={{ fontSize: '0.8125rem', padding: '6px 12px' }}
        >
          <Server size={14} color="var(--primary)" />
          <span>Server: <strong>{serverConfig.machineName ? `${serverConfig.machineName} (${serverConfig.hostname})` : serverConfig.hostname}</strong></span>
          <span className={`badge ${serverConfig.status === 'connected' ? 'badge-primary' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>
            {serverConfig.status === 'connected' ? 'Connected' : 'Offline'}
          </span>
        </button>

        {/* Live Active Upload Progress Indicator */}
        {uploadState?.isRunning && (
          <button
            onClick={onNavigateToUpload}
            className="btn-secondary"
            style={{
              fontSize: '0.8125rem',
              padding: '6px 12px',
              borderColor: 'var(--primary)',
              background: 'var(--bg-subtle)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            title="Analisis sedang berjalan di latar belakang. Klik untuk membuka halaman upload."
          >
            <RefreshCw size={13} className="spin" />
            <span>Analisis Video: <strong>{uploadState.progress}%</strong></span>
          </button>
        )}

        {/* Upload Video Button */}
        <button className="btn-primary" onClick={onOpenUploadModal} style={{ fontSize: '0.8125rem', padding: '6px 14px' }}>
          <Upload size={14} /> Upload Video
        </button>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-light)' }} />

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-light)', objectFit: 'cover' }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-light)', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}
            >
              {(user.name || '?').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ fontSize: '0.8125rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{user.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Project Leader</div>
          </div>
          <button onClick={onLogout} className="btn-secondary" style={{ padding: '6px', borderRadius: '6px' }} title="Log Out">
            <LogOut size={14} color="var(--text-muted)" />
          </button>
        </div>
      </div>
    </header>
  );
}
