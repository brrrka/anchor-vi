import React from 'react';
import { Film, Cpu, FileVideo, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function OverviewTab({ cases = [], onSelectCase, onOpenUploadModal, onOpenServerConfig, serverConfig }) {
  const carCases = cases.filter((item) => (item.roadUserPair || item.variables?.roadUserPair || '').toLowerCase().replace(/[–—]/g, '-').replace(/\s/g, '') === 'car-car');
  const candidateCases = cases.filter((item) => item.analysisStatus === 'potential_contact_found');
  const matrixCount = cases.filter((item) => item.matrix13).length * 13;
  const scenarioCounts = cases.reduce((acc, item) => {
    const label = item.crashType || item.variables?.crashType || 'Unclassified';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const scenarioData = Object.entries(scenarioCounts).map(([name, count]) => ({
    name: name.length > 22 ? `${name.slice(0, 20)}...` : name,
    fullName: name,
    count,
  }));
  const countryCounts = cases.reduce((acc, item) => {
    const country = item.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="clean-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-primary">ANCHOR VI RESEARCH</span>
              <span className="badge badge-neutral">2026 - 2027</span>
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '4px' }}>Car–Car Crash Scenario Identification</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>YOLO11s · ByteTrack · Trajectory Analysis · Rule-Based Crash Classification</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={onOpenServerConfig} style={{ fontSize: '0.8125rem' }}><Cpu size={14} /> Server ({serverConfig?.hostname || 'Local'})</button>
            <button className="btn-primary" onClick={onOpenUploadModal} style={{ fontSize: '0.8125rem' }}><Film size={14} /> Upload Video</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px' }}>
        {[
          { label: 'Saved Analysis Cases', value: cases.length, note: 'Real uploads saved in dashboard', icon: <Database size={16} /> },
          { label: 'Car–Car Cases', value: carCases.length, note: 'Current project scope', icon: <FileVideo size={16} /> },
          { label: 'Potential Contact Cases', value: candidateCases.length, note: 'Backend candidate events', icon: <Film size={16} /> },
          { label: 'Matrix Fields Stored', value: matrixCount, note: '13 fields per saved analysis', icon: <Cpu size={16} /> },
        ].map((item) => (
          <div className="clean-card" style={{ padding: '16px' }} key={item.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.icon}{item.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '4px' }}>{item.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.note}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px' }}>
        <div className="clean-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '14px' }}>Crash Type Distribution — Uploaded Cases</h3>
          {scenarioData.length ? <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarioData} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} interval={0} angle={-10} textAnchor="end" />
                <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-heading)' }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <div style={{ height: '220px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Belum ada hasil analisis. Upload video CCTV untuk memulai.</div>}
        </div>

        <div className="clean-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '14px' }}>Cases by Country</h3>
          {Object.keys(countryCounts).length ? Object.entries(countryCounts).map(([country, count]) => (
            <div key={country} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', marginBottom: '8px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.8125rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{country}</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{count} cases</span>
            </div>
          )) : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Belum ada metadata negara dari kasus yang diunggah.</div>}
        </div>
      </div>

      <div className="clean-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '14px' }}>Recently Analyzed Cases</h3>
        {cases.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
          {cases.slice(0, 3).map((item) => (
            <div key={item.id} className="clean-card" style={{ padding: '12px', cursor: 'pointer' }} onClick={() => onSelectCase(item)}>
              <div style={{ width: '100%', height: '120px', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bg-subtle)', display: 'grid', placeItems: 'center' }}>
                {item.thumbnail ? <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileVideo size={30} color="var(--text-muted)" />}
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '2px' }}>{item.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '6px' }}>{item.crashType}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}><span>{item.roadUserPair}</span><span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Detail →</span></div>
            </div>
          ))}
        </div> : <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Belum ada kasus tersimpan. Gunakan Upload Video untuk menjalankan backend.</div>}
      </div>
    </div>
  );
}
