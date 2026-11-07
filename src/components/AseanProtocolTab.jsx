import React from 'react';
import { Shield, Download } from 'lucide-react';
import { ASEAN_NCAP_PROTOCOLS } from '../data/dummyCases';

export default function AseanProtocolTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Banner */}
      <div className="clean-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-primary">RESEARCH DELIVERABLE 4</span>
              <span className="badge badge-neutral">ASEAN NCAP Framework</span>
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '4px' }}>
              ASEAN Crash Scenario Recommendations Catalogue
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              Translation of computer vision crash findings into representative vehicle safety assessment scenarios.
            </p>
          </div>

          <a
            href="/assets/download.pdf"
            download="download.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ fontSize: '0.8125rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Download PDF Catalogue
          </a>
        </div>
      </div>

      {/* Recommended Protocols */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {ASEAN_NCAP_PROTOCOLS.map((proto) => (
          <div key={proto.code} className="clean-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.8125rem' }}>{proto.code}</span>
                <Shield size={16} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
                {proto.name}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '12px' }}>
                {proto.focus}
              </p>
            </div>

            <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '0.75rem', color: 'var(--text-body)' }}>
              Evaluation Speed: <strong>30 – 60 km/h Impact Vector</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Recap */}
      <div className="clean-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '8px' }}>
          ANCHOR VI Study Outcome & Impact
        </h3>
        <p style={{ color: 'var(--text-body)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Sistem ANCHOR VI ini berfokus pada kandidat konflik Car–Car; hasil algoritma harus divalidasi sebelum dijadikan bukti evaluasi protokol resmi. The findings identify critical crash configurations, impact characteristics, and pre-crash manoeuvres to inform future AEB-MC, BST, RCTA/B, ARV, CCR, and CTR evaluation scenarios under real-world ASEAN traffic conditions.
        </p>
      </div>
    </div>
  );
}
