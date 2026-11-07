import React, { useState } from 'react';
import { Database, Search, Download, Eye, Trash2 } from 'lucide-react';
import { CRASH_TYPES } from '../data/dummyCases';

export default function CrashDatabaseTab({ cases, onSelectCase, onDeleteCase }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPair, setFilterPair] = useState('ALL');
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  const filteredCases = cases.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPair = filterPair === 'ALL' || item.roadUserPair === filterPair;
    const matchesCountry = filterCountry === 'ALL' || item.country === filterCountry;
    const matchesType = filterType === 'ALL' || item.crashType === filterType;

    return matchesSearch && matchesPair && matchesCountry && matchesType;
  });

  const exportCsv = () => {
    const headers = [
      'Case ID',
      'Judul Kasus',
      'Tanggal & Waktu',
      'Lokasi CCTV',
      'Negara',
      'Cuaca',
      'Pencahayaan',
      'Kondisi Permukaan Jalan',
      '1. Jenis Kejadian (Crash Scenario)',
      'Kode Skenario',
      '2. Pasangan Pengguna Jalan',
      'Kendaraan 1 ID',
      'Peran Kendaraan 1',
      '3. Manuver Kendaraan 1',
      'Kendaraan 2 ID',
      'Peran Kendaraan 2',
      '4. Manuver Kendaraan 2',
      '5. Kecepatan V1 Pra-Kontak (km/jam)',
      'Rata-rata V1 Sepanjang Video (km/jam)',
      '6. Kecepatan V2 Pra-Kontak (km/jam)',
      'Rata-rata V2 Sepanjang Video (km/jam)',
      '7. Kecepatan Relatif (km/jam)',
      '8. Kecepatan Impak / Closing Speed (km/jam)',
      '9. Sudut Pendekatan (derajat)',
      '10. Reaksi Menghindar',
      '11. Titik Benturan (Point of Impact)',
      '12. Indikasi Risiko Benturan (Severity)',
      '13. Cuaca & Kondisi',
      'Tingkat Keyakinan Klasifikasi',
      'Status Kalibrasi Kamera',
      'Rekomendasi Protokol ASEAN NCAP',
      'Jumlah Sampel Kecepatan V1',
      'Jumlah Sampel Kecepatan V2',
      'Frame Vektor Pasangan Bersama',
      'URL Video Analisis'
    ];

    const rows = filteredCases.map(item => {
      const v = item.variables || {};
      return [
        item.id || '',
        item.title || '',
        item.timestamp || '',
        item.location || '',
        item.country || '',
        item.weather || v.weather || '',
        item.lighting || v.lighting || '',
        item.roadSurface || v.roadSurface || '',
        item.crashType || v.crashType || '',
        v.crashTypeCode || '',
        item.roadUserPair || v.roadUserPair || '',
        v.vehicle1Id ?? '',
        v.vehicle1Role || '',
        v.vehicle1Maneuver || '',
        v.vehicle2Id ?? '',
        v.vehicle2Role || '',
        v.vehicle2Maneuver || '',
        v.vehicle1Speed ?? '',
        v.vehicle1AverageSpeed ?? '',
        v.vehicle2Speed ?? '',
        v.vehicle2AverageSpeed ?? '',
        v.relativeSpeed ?? '',
        v.impactSpeed ?? '',
        v.impactAngle ?? '',
        v.evasiveAction || '',
        v.pointOfImpact || '',
        v.severityCategory || v.crashSeverity || '',
        v.weather || item.weather || '',
        v.classificationConfidence || '',
        v.speedStatus || 'uncalibrated',
        Array.isArray(item.suggestedProtocols) ? item.suggestedProtocols.join('; ') : (item.suggestedProtocols || ''),
        v.vehicle1SpeedSampleCount ?? 0,
        v.vehicle2SpeedSampleCount ?? 0,
        v.pairSpeedSampleCount ?? 0,
        item.videoUrl || ''
      ];
    });

    const csvContent = [
      headers,
      ...rows
    ].map(row => row.map(val => `"${String(val ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');

    // Tambahkan UTF-8 BOM (\uFEFF) agar Microsoft Excel membuka karakter dengan sempurna
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `ANCHOR_VI_Crash_Database_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filters */}
      <div className="clean-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--primary)" /> Crash Database Library
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              {filteredCases.length} cases reconstructed with 13 computer vision telemetry variables.
            </p>
          </div>

          <button className="btn-secondary" onClick={exportCsv} style={{ fontSize: '0.8125rem' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '32px' }}
              placeholder="Search Case ID or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select className="form-select" value={filterPair} onChange={(e) => setFilterPair(e.target.value)}>
            <option value="ALL">All Pairs</option>

            <option value="Car – Car">Car – Car</option>
          </select>

          <select className="form-select" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
            <option value="ALL">All Countries</option>
            <option value="Indonesia">Indonesia 🇮🇩</option>
            <option value="Malaysia">Malaysia 🇲🇾</option>
            <option value="Thailand">Thailand 🇹🇭</option>
            <option value="Vietnam">Vietnam 🇻🇳</option>
          </select>

          <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="ALL">All Scenarios</option>
            {CRASH_TYPES.CAR_CAR.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="clean-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Case ID</th>
              <th style={{ padding: '12px 16px' }}>Location</th>
              <th style={{ padding: '12px 16px' }}>Crash Scenario Type</th>
              <th style={{ padding: '12px 16px' }}>Pair</th>
              <th style={{ padding: '12px 16px' }}>Impact Speed</th>
              <th style={{ padding: '12px 16px' }}>Severity</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-heading)' }}>
                  {item.id} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>({item.flag})</span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-body)' }}>{item.location}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary)' }}>{item.crashType}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`badge ${item.roadUserPair === 'Motorcycle – Car' ? 'badge-primary' : 'badge-blue'}`}>
                    {item.roadUserPair}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-heading)' }}>
                  {item.variables?.impactSpeed == null ? 'Tidak tersedia' : `${item.variables.impactSpeed} km/jam`}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`badge ${item.variables?.crashSeverity === 'Fatal' ? 'badge-red' : item.variables?.crashSeverity === 'Severe Injury' ? 'badge-amber' : 'badge-primary'}`}>
                    {item.variables?.crashSeverity || 'Tidak diketahui'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button className="btn-secondary" onClick={() => onSelectCase(item)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    <Eye size={12} /> View Details
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => onDeleteCase(item)}
                    style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#dc2626' }}
                    title={`Hapus ${item.id}`}
                    aria-label={`Hapus history ${item.id}`}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
