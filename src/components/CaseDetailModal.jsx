import React, { useState } from 'react';
import { X, Activity, FileText, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const show = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') return 'Tidak tersedia';
  return `${value}${suffix}`;
};

export default function CaseDetailModal({ selectedCase, onClose }) {
  const [showVideoNote, setShowVideoNote] = useState(true);
  if (!selectedCase) return null;

  const variables = selectedCase.variables || {};
  const speedProfile = selectedCase.speedProfile || [];
  const contactV1 = selectedCase.variables?.vehicle1Id;
  const contactV2 = selectedCase.variables?.vehicle2Id;
  const contactIds = new Set([contactV1, contactV2].filter(x => x !== null && x !== undefined).map(Number));
  // Hide all non-contact vehicles, including when a cached job contains them.
  const vehicleSpeedSummaries = (selectedCase.vehicleSpeedSummaries || [])
    .filter(row => contactIds.has(Number(row.vehicle_id)));
  const vehicleSpeedProfiles = (selectedCase.vehicleSpeedProfiles || [])
    .filter(row => contactIds.has(Number(row.vehicle_id)));
  const pairDiagnostics = selectedCase.pairDiagnostics || [];
  const detectionDiagnostics = selectedCase.detectionDiagnostics || {};
  const hasDetectionDiagnostics = Object.keys(detectionDiagnostics).length > 0;
  const diagnosticUrl = selectedCase.apiBaseUsed && selectedCase.jobId ? `${selectedCase.apiBaseUsed}/api/jobs/${selectedCase.jobId}/diagnostics` : null;
  const cameraAutoEstimate = selectedCase.cameraAutoEstimate || {};
  const calibration = selectedCase.calibration || {};
  const autoCalibration = selectedCase.autoCalibration || {};
  const vehiclePixelChartMap = new Map();
  vehicleSpeedProfiles.forEach((profile) => {
    (profile.points || []).forEach((point) => {
      const key = String(point.time_s ?? point.time ?? point.frame);
      if (!vehiclePixelChartMap.has(key)) vehiclePixelChartMap.set(key, { time: key });
      vehiclePixelChartMap.get(key)[`vehicle_${profile.vehicle_id}`] = point.speed_px_s ?? null;
    });
  });
  const vehiclePixelChartData = Array.from(vehiclePixelChartMap.values()).sort((a, b) => Number(a.time) - Number(b.time));
  const protocols = selectedCase.aseanNcapRelevance || [];
  const event = selectedCase.eventInfo || null;
  const hasMetricSpeedProfile = speedProfile.some((row) => row.v1Speed != null || row.v2Speed != null);
  const v1Id = variables.vehicle1Id ?? event?.v1;
  const v2Id = variables.vehicle2Id ?? event?.v2;

  const cardStyle = {
    background: 'var(--bg-subtle)', padding: '14px', borderRadius: '8px',
    border: '1px solid var(--border-light)', minWidth: 0,
  };
  const headingStyle = {
    fontSize: '0.78rem', fontWeight: 800, marginBottom: '12px',
    textTransform: 'uppercase', letterSpacing: '0.02em',
  };
  const itemStyle = { marginBottom: '10px', lineHeight: 1.5, overflowWrap: 'anywhere' };
  const labelStyle = { color: 'var(--text-muted)' };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1180px', width: '96%' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'var(--bg-card)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)' }}>{selectedCase.id} {selectedCase.flag}</h2>
              <span className="badge badge-primary">{selectedCase.crashType || variables.crashType || 'Hasil analisis'}</span>
              <span className="badge badge-blue">{selectedCase.roadUserPair || variables.roadUserPair || 'Mobil – Mobil'}</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '3px' }}>{selectedCase.location} • {selectedCase.date}</div>
            {event && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                Waktu kandidat: {event.time_s ?? 'Tidak tersedia'} detik · Frame: {event.event_frame ?? 'Tidak tersedia'} ·
                {' '}Kendaraan 1: ID {v1Id ?? '—'} · Kendaraan 2: ID {v2Id ?? '—'}
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Tutup detail" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 1fr)', gap: '14px' }}>
            <div className="clean-card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>Video CCTV dan penanda hasil analisis</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {selectedCase.videoUrl && (
                    <a
                      href={`${selectedCase.videoUrl}?download=true`}
                      download={`ANCHOR_VI_${selectedCase.id || 'case'}.mp4`}
                      className="btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.72rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Download video MP4 teranotasi"
                    >
                      <Download size={12} /> Download Video
                    </a>
                  )}
                  <button onClick={() => setShowVideoNote((v) => !v)} className="btn-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>{showVideoNote ? 'Sembunyikan catatan' : 'Tampilkan catatan'}</button>
                </div>
              </div>
              {selectedCase.videoUrl ? (
                <video
                  controls
                  playsInline
                  preload="auto"
                  key={selectedCase.videoUrl}
                  style={{ width: '100%', maxHeight: '340px', background: '#0f172a', borderRadius: '6px', display: 'block' }}
                >
                  <source src={selectedCase.videoUrl} type="video/mp4" />
                  Browser Anda tidak mendukung pemutar video HTML5. Silakan download video menggunakan tombol di atas.
                </video>
              ) : (
                <div style={{ height: '220px', display: 'grid', placeItems: 'center', background: 'var(--bg-subtle)', borderRadius: '6px', color: 'var(--text-muted)' }}>Video hasil tidak tersedia</div>
              )}
              {showVideoNote && <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kotak berwarna menandai ID kendaraan. Lingkaran merah menunjukkan lokasi kandidat kontak, bukan bukti final benturan fisik.</p>}
            </div>

            <div className="clean-card" style={{ padding: '14px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} color="var(--primary)" /> Riwayat kecepatan sebelum kejadian</span>
              {speedProfile.length > 0 ? (
                <div style={{ width: '100%', height: '220px', marginTop: '8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={speedProfile}>
                      <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} unit={hasMetricSpeedProfile ? ' km/jam' : ' px/s'} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-heading)' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                      {hasMetricSpeedProfile ? (
                        <>
                          <Line type="monotone" dataKey="v1Speed" name={`Kendaraan 1 (ID ${v1Id ?? '—'})`} stroke="var(--primary)" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="v2Speed" name={`Kendaraan 2 (ID ${v2Id ?? '—'})`} stroke="#d97706" strokeWidth={2} dot={false} />
                        </>
                      ) : (
                        <>
                          <Line type="monotone" dataKey="v1PixelSpeed" name={`Kendaraan 1 (ID ${v1Id ?? '—'}) — px/s`} stroke="var(--primary)" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="v2PixelSpeed" name={`Kendaraan 2 (ID ${v2Id ?? '—'}) — px/s`} stroke="#d97706" strokeWidth={2} dot={false} />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{ minHeight: '190px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Grafik pra-kejadian belum tersedia; lihat ringkasan px/s pasangan V1/V2 di bawah.</div>}
            </div>
          </div>

          <div className="clean-card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '10px' }}>Kecepatan kendaraan pada kandidat kontak utama — V1 dan V2</h3>
            {vehicleSpeedSummaries.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead><tr>{['ID kendaraan', 'Rata-rata km/jam', 'Rata-rata px/s', 'Status', 'Peringatan'].map((heading) => <th key={heading} style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-light)' }}>{heading}</th>)}</tr></thead>
                  <tbody>{vehicleSpeedSummaries.map((row) => <tr key={row.vehicle_id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-light)' }}>Car ID {row.vehicle_id}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-light)', fontWeight: 700 }}>{row.average_speed_kmh == null ? 'Tidak tersedia' : `${row.average_speed_kmh} km/jam`}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-light)' }}>{show(row.average_speed_px_s, ' px/s')}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-light)' }}>{row.speed_status === 'calibrated_reference' ? 'Terkalibrasi' : row.speed_status === 'estimated_prior' ? 'Estimasi rendah' : 'Belum terkalibrasi'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-light)', minWidth: '230px' }}>{row.warning}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Belum ada riwayat kecepatan kendaraan yang cukup.</p>}
            {vehiclePixelChartData.length > 1 && vehicleSpeedProfiles.length > 0 && (
              <div style={{ width: '100%', height: '210px', marginTop: '14px' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Grafik kecepatan citra hanya V1/V2 kandidat kontak utama (px/s).</div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vehiclePixelChartData}>
                    <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} unit=" px/s" />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-heading)' }} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    {vehicleSpeedProfiles.map((profile, index) => <Line key={profile.vehicle_id} type="monotone" dataKey={`vehicle_${profile.vehicle_id}`} name={`Car ID ${profile.vehicle_id}`} stroke={index % 2 ? '#d97706' : 'var(--primary)'} strokeWidth={2} dot={false} connectNulls={false} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={{ marginTop: '10px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Perspektif otomatis: <strong>{cameraAutoEstimate.label || 'Belum diperkirakan'}</strong> · Keyakinan: <strong>{cameraAutoEstimate.confidence || 'Tidak tersedia'}</strong><br />
              Kalibrasi metrik: <strong>{calibration.status || 'Tidak tersedia'}</strong> · {autoCalibration.warning || calibration.absolute_speed_note || 'Tanpa anchor meter, kecepatan km/jam tidak dapat dijamin akurat.'}
            </div>
          </div>

          <div className="clean-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '7px' }}><FileText size={17} color="var(--primary)" /> Matriks 13 Variabel Penelitian ANCHOR VI</h3>
              <span className="badge badge-primary">Standar penelitian ANCHOR VI</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
              <section style={cardStyle}>
                <div style={{ ...headingStyle, color: 'var(--primary)' }}>A. Konfigurasi Kecelakaan</div>
                <div style={itemStyle}><span style={labelStyle}>1. Jenis kejadian: </span><strong>{show(variables.crashType)}</strong></div>
                <div style={itemStyle}><span style={labelStyle}>2. Pasangan pengguna jalan: </span><strong>{show(variables.roadUserPair)}</strong></div>
                <div style={itemStyle}><span style={labelStyle}>Kendaraan 1 (ID {show(v1Id)}): </span><strong>{show(variables.vehicle1Role)}</strong></div>
                <div style={itemStyle}><span style={labelStyle}>3. Manuver kendaraan 1: </span><strong>{show(variables.vehicle1Maneuver)}</strong></div>
                <div style={itemStyle}><span style={labelStyle}>Kendaraan 2 (ID {show(v2Id)}): </span><strong>{show(variables.vehicle2Role)}</strong></div>
                <div style={itemStyle}><span style={labelStyle}>4. Manuver kendaraan 2: </span><strong>{show(variables.vehicle2Maneuver)}</strong></div>
              </section>

              <section style={cardStyle}>
                <div style={{ ...headingStyle, color: 'var(--accent-blue)' }}>B. Dinamika Kecelakaan</div>
                <div style={itemStyle}><span style={labelStyle}>Rata-rata kecepatan V1 sepanjang video: </span><strong>{show(variables.vehicle1AverageSpeed, ' km/jam')}</strong></div>
                <div style={itemStyle}><span style={labelStyle}>Rata-rata kecepatan V2 sepanjang video: </span><strong>{show(variables.vehicle2AverageSpeed, ' km/jam')}</strong></div>
                <div style={itemStyle}><span style={labelStyle}>5. Kecepatan V1: </span><strong>{show(variables.vehicle1Speed, ' km/jam')}</strong></div>
                <div style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginBottom: 8 }}>Sumber: {variables.vehicle1SpeedSource === 'pre_impact_mean_0_8s' ? 'Mean 0,8 detik pra-kontak' : variables.vehicle1SpeedSource === 'unavailable' ? 'Tidak tersedia' : `Fallback — ${variables.vehicle1SpeedSourceLabel || 'pra-kontak'}`}</div>
                <div style={itemStyle}><span style={labelStyle}>6. Kecepatan V2: </span><strong>{show(variables.vehicle2Speed, ' km/jam')}</strong></div>
                <div style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginBottom: 8 }}>Sumber: {variables.vehicle2SpeedSource === 'pre_impact_mean_0_8s' ? 'Mean 0,8 detik pra-kontak' : variables.vehicle2SpeedSource === 'unavailable' ? 'Tidak tersedia' : `Fallback — ${variables.vehicle2SpeedSourceLabel || 'pra-kontak'}`}</div>
                <div style={itemStyle}><span style={labelStyle}>7. Kecepatan relatif: </span><strong>{show(variables.relativeSpeed, ' km/jam')}</strong></div>
                <div style={itemStyle}><span style={labelStyle}>8. Kecepatan impak (closing speed): </span><strong>{show(variables.impactSpeed, ' km/jam')}</strong></div>
                <div style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginBottom: 8 }}>Sumber vektor pasangan: {variables.pairSpeedSource === 'pre_impact_mean_0_8s' ? 'Mean 0,8 detik pra-kontak' : variables.pairSpeedSource === 'unavailable' ? 'Tidak ada pasangan vektor serempak' : `Fallback — ${variables.pairSpeedSourceLabel || 'pra-kontak'}`}</div>
                <div style={itemStyle}><span style={labelStyle}>9. Sudut pendekatan: </span><strong>{show(variables.impactAngle, '°')}</strong></div>
                <div style={itemStyle}><span style={labelStyle}>10. Reaksi menghindar: </span><strong>{show(variables.evasiveAction)}</strong></div>
              </section>

              <section style={cardStyle}>
                <div style={{ ...headingStyle, color: '#ef4444' }}>C. Keparahan dan Dampak</div>
                <div style={itemStyle}><span style={labelStyle}>11. Titik benturan (estimasi): </span><strong>{show(variables.pointOfImpact)}</strong></div>
                <div style={itemStyle}><span style={labelStyle}>12. Tingkat keparahan: </span><strong>{show(variables.crashSeverity)}</strong></div>
              </section>

              <section style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ ...headingStyle, color: 'var(--text-heading)' }}>D. Variabel Lingkungan</div>
                  <div style={itemStyle}><span style={labelStyle}>13. Cuaca dan kondisi: </span><strong>{show(variables.weather)}</strong></div>
                  <div style={itemStyle}><span style={labelStyle}>Keyakinan klasifikasi: </span><strong>{show(variables.classificationConfidence)}</strong></div>
                  <div style={itemStyle}><span style={labelStyle}>Alasan penetapan V1/V2: </span><strong>{show(variables.roleAssignmentReason)}</strong></div>
                  <div style={{ marginTop: '10px' }}>
                    <span style={labelStyle}>Protokol terkait (indikatif):</span>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
                      {protocols.length ? protocols.map((protocol) => <span key={protocol} className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{protocol}</span>) : <span style={{ color: 'var(--text-muted)' }}>Belum ditentukan</span>}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {event?.classificationEvidence?.length > 0 && (
            <div className="clean-card" style={{ padding: '14px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--text-heading)' }}>Bukti aturan klasifikasi</strong>
              <ul style={{ margin: '8px 0 0 18px', fontSize: '0.77rem', color: 'var(--text-muted)' }}>
                {event.classificationEvidence.map((line, index) => <li key={index}>{line}</li>)}
              </ul>
            </div>
          )}

          <div className="clean-card" style={{ padding: '14px' }}>
            <strong style={{ fontSize: '0.82rem', color: 'var(--text-heading)' }}>Diagnostik pelacakan dan kandidat kontak</strong>
            {!hasDetectionDiagnostics && (
              <p style={{ margin: '7px 0', fontSize: '0.77rem', color: '#b45309' }}>
                Data diagnosis tidak tersimpan pada kasus ini. Ini sering terjadi bila kasus dibuat sebelum frontend/backend v3.3 atau berasal dari server lain. Unggah ulang video setelah memastikan alamat API dan versi backend yang benar.
              </p>
            )}
            <p style={{ margin: '7px 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Frame dengan ≥2 mobil: {detectionDiagnostics.frames_with_two_or_more_cars ?? 'Tidak tersedia'} · Maksimum mobil/frame: {detectionDiagnostics.max_cars_in_one_frame ?? 'Tidak tersedia'} · Unique ID: {(detectionDiagnostics.unique_track_ids || []).join(', ') || 'Tidak tersedia'}
            </p>
            <p style={{ margin: '4px 0 10px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Job ID: {selectedCase.jobId || 'Kasus lama / tidak tersedia'} · Pipeline: {selectedCase.analysisPipelineBuild || 'Tidak tersedia'} · Server: {selectedCase.apiBaseUsed || 'Tidak dicatat'}
              {diagnosticUrl && <> · <a href={diagnosticUrl} target="_blank" rel="noopener noreferrer">Buka JSON diagnosis</a></>}
            </p>
            {pairDiagnostics.length > 0 ? pairDiagnostics.map((pair) => <div key={(pair.vehicle_ids || []).join('-')} style={{ borderTop: '1px solid var(--border-light)', padding: '8px 0', fontSize: '0.76rem' }}>
              <strong>ID {(pair.vehicle_ids || []).join(' – ')}</strong> · frame bersama: {pair.frames_compared ?? 0} · gap minimum: {show(pair.min_bbox_gap_px, ' px')} · IoU maksimum: {show(pair.max_bbox_iou)} · kandidat: {pair.candidate_emitted ? 'Ya' : 'Tidak'}<br />
              <span style={{ color: 'var(--text-muted)' }}>{pair.last_reason || 'Tidak ada catatan diagnosis.'}</span>
            </div>) : <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '7px' }}>Tidak ada pasangan yang dapat dibandingkan pada frame yang sama.</p>}
          </div>

          {selectedCase.aiLogs?.length > 0 && (
            <div className="clean-card" style={{ padding: '14px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--text-heading)' }}>Catatan analisis</strong>
              <ul style={{ margin: '8px 0 0 18px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {selectedCase.aiLogs.map((line, index) => <li key={index}>{line}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
