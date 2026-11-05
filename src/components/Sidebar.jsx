import React from 'react';
import { LayoutDashboard, Database, Upload, Shield, Server } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, totalCases }) {
  const menuItems = [
    { id: 'overview', label: 'Overview & Analytics', icon: LayoutDashboard },
    { id: 'database', label: 'Crash Database Library', icon: Database, count: totalCases },
    { id: 'upload', label: 'Upload & AI Analysis', icon: Upload },
    { id: 'asean', label: 'ASEAN NCAP Protocols', icon: Shield },
    { id: 'server', label: 'AI Server Connection', icon: Server }
  ];

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-light)',
      padding: '20px 12px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: 'calc(100vh - 57px)',
      position: 'sticky',
      top: '57px',
      transition: 'background-color 0.2s ease, border-color 0.2s ease'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', padding: '0 8px 8px 8px' }}>
          Navigation Menu
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '6px',
                border: 'none',
                background: isActive ? 'var(--bg-subtle)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-body)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={16} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '2px' }}>ANCHOR VI Proposal</div>
        <div>Dataset: Indonesia & Malaysia</div>
      </div>
    </aside>
  );
}
