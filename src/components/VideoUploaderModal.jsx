import React, { useEffect, useState, useRef } from 'react';
import { Upload, Film, CheckCircle, RefreshCw, X, AlertTriangle, Download, ArrowLeft } from 'lucide-react';
import { resolveApiBase, authFetch, withAccessToken } from '../api';

const display = (value, suffix = '') => value === null || value === undefined || value === '' ? 'Tidak tersedia' : `${value}${suffix}`;

const normalizeCameraKey = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/g, '');

function findMatchingCalibratedProfile(profiles, locationName) {
  const locationKey = normalizeCameraKey(locationName);
  const defaultLocationKey = normalizeCameraKey('Lokasi CCTV belum diisi');
  if (!locationKey || locationKey === defaultLocationKey) return null;

  return (profiles || []).find((p) => {
    const idKey = normalizeCameraKey(p?.camera_id);
    const nameKey = normalizeCameraKey(p?.camera_name);
    return (idKey && (locationKey === idKey || locationKey.includes(idKey))) ||
           (nameKey && (locationKey === nameKey || locationKey.includes(nameKey)));
  }) || null;
}

const statusLabel = (status) => ({
  calibrated_reference: 'Terkalibrasi dengan referensi meter',
  estimated_prior: 'Estimasi prior geometri — keyakinan rendah',
  uncalibrated: 'Belum terkalibrasi — hanya px/s',
  mixed: 'Status kalibrasi V1/V2 berbeda',
}[status] || 'Tidak tersedia');

function buildCaseFromJob(job, jobId, meta, apiBase) {
  const matrix = job.matrix_13 || {};
  const flagMap = { Indonesia: '🇮🇩', Malaysia: '🇲🇾', Thailand: '🇹🇭', Vietnam: '🇻🇳' };
  const crashType = matrix.crash_type || job.crash_type || 'Belum dapat diklasifikasikan';
  const roadUserPair = matrix.road_user_pair || 'Mobil – Mobil';
  const primaryEvent = job.primary_event || null;
  const locationName = meta.locationName || 'Lokasi CCTV tidak diketahui';
  const country = meta.country || 'Indonesia';

  return {
    id: `KASUS-${jobId.slice(0, 8).toUpperCase()}`,
    jobId,
    apiBaseUsed: apiBase,
    title: `${locationName} - ${crashType}`,
    location: locationName,
    country,
    flag: flagMap[country] || '🇮🇩',
    date: new Date().toLocaleString('id-ID'),
    roadUserPair,
    crashType,
    confidenceScore: null,
    videoUrl: job.video_url ? withAccessToken(`${apiBase}${job.video_url}`) : null,
    variables: {
      crashType,
      roadUserPair,
      vehicle1Id: matrix.vehicle1_id,
      vehicle2Id: matrix.vehicle2_id,
      vehicle1Role: matrix.vehicle1_role,
      vehicle2Role: matrix.vehicle2_role,
      vehicle1Maneuver: matrix.vehicle1_maneuver,
      vehicle2Maneuver: matrix.vehicle2_maneuver,
      vehicle1Speed: matrix.vehicle1_display_speed_kmh ?? matrix.vehicle1_pre_crash_speed_kmh,
      vehicle2Speed: matrix.vehicle2_display_speed_kmh ?? matrix.vehicle2_pre_crash_speed_kmh,
      vehicle1AverageSpeed: matrix.vehicle1_average_speed_kmh,
      vehicle2AverageSpeed: matrix.vehicle2_average_speed_kmh,
      vehicle1SpeedSource: matrix.vehicle1_display_speed_source || matrix.vehicle1_speed_source || 'unavailable',
      vehicle2SpeedSource: matrix.vehicle2_display_speed_source || matrix.vehicle2_speed_source || 'unavailable',
      vehicle1SpeedSourceLabel: matrix.vehicle1_display_speed_source_label || matrix.vehicle1_speed_source_label || 'tidak tersedia',
      vehicle2SpeedSourceLabel: matrix.vehicle2_display_speed_source_label || matrix.vehicle2_speed_source_label || 'tidak tersedia',
      vehicle1SpeedSampleCount: matrix.vehicle1_display_speed_sample_count ?? matrix.vehicle1_speed_sample_count ?? 0,
      vehicle2SpeedSampleCount: matrix.vehicle2_display_speed_sample_count ?? matrix.vehicle2_speed_sample_count ?? 0,
      pairSpeedSource: matrix.pair_speed_source || 'unavailable',
      pairSpeedSourceLabel: matrix.pair_speed_source_label || 'tidak tersedia',
      pairSpeedSampleCount: matrix.pair_speed_sample_count || 0,
      vehicle1SpeedDiagnostics: matrix.vehicle1_speed_diagnostics || {},
      vehicle2SpeedDiagnostics: matrix.vehicle2_speed_diagnostics || {},
      pairSpeedDiagnostic: matrix.pair_speed_diagnostic || '',
      preImpactWindow: matrix.pre_impact_window_seconds ?? 0.8,
      vehicle1SpeedPx: matrix.vehicle1_pre_crash_speed_px_s,
      vehicle2SpeedPx: matrix.vehicle2_pre_crash_speed_px_s,
      relativeSpeed: matrix.relative_speed_kmh,
      relativeSpeedPx: matrix.relative_speed_px_s,
      impactSpeed: matrix.impact_speed_kmh,
      impactSpeedPx: matrix.impact_speed_px_s,
      impactAngle: matrix.impact_angle_deg,
      evasiveAction: matrix.evasive_action,
      pointOfImpact: matrix.point_of_impact,
      crashSeverity: matrix.crash_severity,
      severityCategory: matrix.severity_category,
      severityBasis: matrix.severity_basis,
      weather: matrix.weather_conditions || meta.weather,
      classificationConfidence: matrix.classification_confidence,
      roleAssignmentReason: matrix.role_assignment_reason,
      speedStatus: matrix.speed_status,
      speedWarning: matrix.speed_calibration_warning,
    },
    matrix13: matrix,
    eventInfo: primaryEvent ? { ...primaryEvent, classificationEvidence: primaryEvent.classification_evidence || [] } : null,
    candidateEvents: job.candidate_events || [],
    aseanNcapRelevance: job.suggested_protocols || [],
    speedProfile: job.speed_profile || [],
    vehicleSpeedSummaries: job.vehicle_speed_summaries || [],
    vehicleSpeedProfiles: job.vehicle_speed_profiles || [],
    calibration: job.calibration || {},
    analysisPipelineBuild: job.analysis_pipeline_build || null,
    backendApiVersion: job.api_version || null,
    aiLogs: [
      `Video: ${meta.fileName || 'CCTV Video'}`,
      `FPS sumber: ${job.fps ?? 'Tidak tersedia'}`,
      `Jumlah frame diproses: ${job.processed_frames ?? 0}`,
      job.message || '',
      job.video_codec_note || '',
    ].filter(Boolean),
    analysisStatus: job.candidate_event_count > 0 ? 'potential_contact_found' : 'no_candidate_contact',
  };
}

export default function VideoUploaderModal({
  serverConfig,
  onSaveNewCase,
  onCaseAutoSaved,
  isModal = false,
  onClose,
  onUploadStateChange
}) {
  const API_BASE = resolveApiBase(serverConfig);
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('Menyiapkan backend...');
  const [processedCase, setProcessedCase] = useState(null);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('Lokasi CCTV belum diisi');
  const [country, setCountry] = useState('Indonesia');
  const [weather, setWeather] = useState('Unknown');
  const [lighting, setLighting] = useState('Unknown');
  const [roadSurface, setRoadSurface] = useState('Unknown');
  const [cameraProfiles, setCameraProfiles] = useState([]);
  const [activeJobMeta, setActiveJobMeta] = useState(null);

  const isPollingRef = useRef(false);

  // Muat profil kamera
  useEffect(() => {
    let active = true;
    authFetch(`${API_BASE}/api/cameras`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (active) setCameraProfiles(Array.isArray(data.cameras) ? data.cameras : []);
      })
      .catch((err) => {
        console.warn(`[ANCHOR VI] Profil kamera tidak dapat dimuat: ${err.message}`);
        if (active) setCameraProfiles([]);
      });
    return () => { active = false; };
  }, [API_BASE]);

  // Polling helper yang persisten
  const pollJobUntilDone = async (jobId, meta) => {
    isPollingRef.current = true;
    let attempts = 0;
    while (attempts < 3600 && isPollingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!isPollingRef.current) break;
      attempts += 1;

      try {
        const res = await authFetch(`${API_BASE}/api/jobs/${jobId}`);
        if (!res.ok) throw new Error('Tidak dapat mengambil status pemrosesan.');
        const job = await res.json();

        const currentProg = Number(job.progress || 0);
        setProgress(currentProg);
        const msg = job.message || 'Sedang memproses video di background...';
        setCurrentStepText(msg);

        if (onUploadStateChange) {
          onUploadStateChange({
            isRunning: true,
            progress: currentProg,
            step: 2,
            currentStepText: msg,
            fileName: meta.fileName || 'Video CCTV'
          });
        }

        if (job.status === 'failed') {
          throw new Error(job.message || 'Analisis backend gagal.');
        }

        if (job.status === 'completed') {
          const newCase = buildCaseFromJob(job, jobId, meta, API_BASE);
          if (typeof onCaseAutoSaved === 'function') onCaseAutoSaved(newCase);
          setProcessedCase(newCase);
          setProgress(100);
          setStep(3);
          localStorage.removeItem('anchor_active_job');
          if (onUploadStateChange) {
            onUploadStateChange({
              isRunning: false,
              progress: 100,
              step: 3,
              currentStepText: 'Analisis selesai!',
              fileName: meta.fileName
            });
          }
          isPollingRef.current = false;
          return newCase;
        }
      } catch (err) {
        if (attempts > 5 && err.message.includes('HTTP 404')) {
          throw err;
        }
      }
    }
  };

  // Cek apakah ada job yang tersimpan di localStorage (misal setelah refresh browser)
  useEffect(() => {
    const saved = localStorage.getItem('anchor_active_job');
    if (saved && step === 1) {
      try {
        const meta = JSON.parse(saved);
        if (meta?.jobId) {
          setActiveJobMeta(meta);
          setStep(2);
          setCurrentStepText('Menghubungkan kembali ke analisis yang sedang berjalan...');
          pollJobUntilDone(meta.jobId, meta).catch((err) => {
            console.warn('Gagal memulihkan job aktif:', err);
            localStorage.removeItem('anchor_active_job');
            setStep(1);
            setError(err.message || 'Analisis sebelumnya terputus.');
            if (onUploadStateChange) onUploadStateChange({ isRunning: false, progress: 0, step: 1 });
          });
        }
      } catch (e) {
        localStorage.removeItem('anchor_active_job');
      }
    }
  }, [API_BASE]);

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (selected) setFile(selected);
  };

  const startAiAnalysis = async (event) => {
    event.preventDefault();
    if (!file) return;
    setError('');
    setStep(2);
    setProgress(0);
    setCurrentStepText('Mengunggah video ke FastAPI...');

    if (onUploadStateChange) {
      onUploadStateChange({
        isRunning: true,
        progress: 0,
        step: 2,
        currentStepText: 'Mengunggah video...',
        fileName: file.name
      });
    }

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('location_name', locationName || 'Lokasi CCTV tidak diketahui');
      formData.append('country', country);
      formData.append('weather', weather);
      formData.append('lighting', lighting);
      formData.append('road_surface', roadSurface);
      formData.append('camera_view', 'auto');
      formData.append('speed_mode', 'both');
      formData.append('calibration_mode', 'auto');

      const matchingProfile = findMatchingCalibratedProfile(cameraProfiles, locationName);
      if (matchingProfile?.camera_id) {
        formData.append('camera_id', matchingProfile.camera_id);
      }

      const uploadResponse = await authFetch(`${API_BASE}/api/analyze`, { method: 'POST', body: formData });
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadResult.detail || 'Unggah video gagal.');
      
      const jobId = uploadResult.job_id;
      const meta = {
        jobId,
        locationName,
        country,
        weather,
        lighting,
        roadSurface,
        fileName: file.name
      };

      setActiveJobMeta(meta);
      // Simpan job ID ke localStorage agar selamat meski browser di-refresh
      localStorage.setItem('anchor_active_job', JSON.stringify(meta));

      await pollJobUntilDone(jobId, meta);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat menganalisis video.');
      setStep(1);
      localStorage.removeItem('anchor_active_job');
      if (onUploadStateChange) onUploadStateChange({ isRunning: false, progress: 0, step: 1 });
    }
  };

  const cancelActiveJob = () => {
    isPollingRef.current = false;
    localStorage.removeItem('anchor_active_job');
    setStep(1);
    setProgress(0);
    setError('Proses analisis dibatalkan oleh pengguna.');
    if (onUploadStateChange) onUploadStateChange({ isRunning: false, progress: 0, step: 1 });
  };

  const resetForNewUpload = () => {
    setProcessedCase(null);
    setFile(null);
    setProgress(0);
    setError('');
    setStep(1);
    localStorage.removeItem('anchor_active_job');
    if (onUploadStateChange) onUploadStateChange({ isRunning: false, progress: 0, step: 1 });
  };

  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async () => {
    setSaveError('');
    setError('');
    if (!processedCase) {
      setSaveError('Hasil analisis belum siap disimpan.');
      return;
    }
    if (typeof onSaveNewCase !== 'function') {
      setSaveError('Fungsi penyimpan kasus tidak tersedia.');
      return;
    }
    setIsSaving(true);
    try {
      await onSaveNewCase(processedCase);
      localStorage.removeItem('anchor_active_job');
      if (onUploadStateChange) onUploadStateChange({ isRunning: false, progress: 100, step: 3 });
      if (onClose) onClose();
    } catch (saveErr) {
      setSaveError(saveErr?.message || 'Penyimpanan kasus gagal.');
    } finally {
      setIsSaving(false);
    }
  };

  const variables = processedCase?.variables || {};
  const cardStyle = { background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '14px', minWidth: 0, lineHeight: 1.5 };
  const itemStyle = { marginBottom: '8px', overflowWrap: 'anywhere' };
  const labelStyle = { color: 'var(--text-muted)' };

  const content = (
    <div style={{ padding: isModal ? '22px' : '0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={20} color="var(--primary)" /> Unggah Video CCTV untuk Analisis Kecelakaan
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            Pemrosesan berjalan di latar belakang (persisten). Anda bebas berpindah tab kapan saja.
          </p>
        </div>
        {isModal && (
          <button
            onClick={() => {
              if (step === 2) {
                alert('Proses upload dan analisis video sedang berjalan di backend. Harap tunggu hingga proses selesai atau klik Batalkan.');
                return;
              }
              if (onClose) onClose();
            }}
            aria-label="Tutup"
            title={step === 2 ? 'Analisis sedang berlangsung, tidak dapat ditutup' : 'Tutup modal'}
            style={{
              background: 'none',
              border: 'none',
              color: step === 2 ? 'var(--border-hover)' : 'var(--text-muted)',
              cursor: step === 2 ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '4px'
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {error && <p role="alert" style={{ color: '#dc2626', marginBottom: '12px' }}>Gagal: {error}</p>}

      {step === 1 && (
        <form onSubmit={startAiAnalysis} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          <div className="clean-card" style={{ padding: '22px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <input id="video-file-input" type="file" accept="video/mp4,video/avi,video/quicktime,video/x-matroska" onChange={handleFileChange} style={{ display: 'none' }} />
            <label htmlFor="video-file-input" style={{ border: '2px dashed var(--border-hover)', borderRadius: '8px', padding: '36px 16px', cursor: 'pointer', background: 'var(--bg-subtle)' }}>
              <Film size={32} color="var(--primary)" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.88rem' }}>{file ? file.name : 'Pilih rekaman CCTV'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'MP4, AVI, MOV, MKV · Maksimal 250 MB'}</div>
            </label>
            <p style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sistem menganalisis seluruh kendaraan dan tujuh skenario Car–Car ANCHOR VI secara otomatis tanpa perlu memilih sudut kamera manual.</p>
          </div>

          <div className="clean-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '12px' }}>Metadata Video</h3>
            <div className="form-group">
              <label className="form-label">Lokasi CCTV</label>
              <input type="text" className="form-input" value={locationName} onChange={(e) => setLocationName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Negara</label>
              <select className="form-select" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="Indonesia">Indonesia 🇮🇩</option>
                <option value="Malaysia">Malaysia 🇲🇾</option>
                <option value="Thailand">Thailand 🇹🇭</option>
                <option value="Vietnam">Vietnam 🇻🇳</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div className="form-group"><label className="form-label">Cuaca</label><select className="form-select" value={weather} onChange={(e) => setWeather(e.target.value)}><option value="Unknown">Unknown</option><option value="Clear">Clear</option><option value="Rain">Rain</option><option value="Fog">Fog</option></select></div>
              <div className="form-group"><label className="form-label">Pencahayaan</label><select className="form-select" value={lighting} onChange={(e) => setLighting(e.target.value)}><option value="Unknown">Unknown</option><option value="Daylight">Daylight</option><option value="Night">Night</option><option value="Dusk">Dusk</option></select></div>
              <div className="form-group"><label className="form-label">Permukaan</label><select className="form-select" value={roadSurface} onChange={(e) => setRoadSurface(e.target.value)}><option value="Unknown">Unknown</option><option value="Dry">Dry</option><option value="Wet">Wet</option></select></div>
            </div>
            <button type="submit" className="btn-primary" disabled={!file} style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}>
              Mulai Analisis AI
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="clean-card" style={{ padding: '36px', textAlign: 'center' }}>
          <RefreshCw size={36} color="var(--primary)" className="spin" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>Menganalisis Rekaman CCTV...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '6px', maxWidth: '500px', margin: '6px auto 16px auto' }}>{currentStepText}</p>
          
          <div style={{ width: '100%', maxWidth: '420px', height: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', margin: '0 auto', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>{progress}%</div>

          <div style={{ marginTop: '20px', padding: '10px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', display: 'inline-block', maxWidth: '520px' }}>
            <span style={{ fontSize: '0.75rem', color: '#1e40af' }}>
              💡 <strong>Proses Persisten:</strong> Anda bebas membuka tab Overview, Database, atau halaman lain. Proses inferensi akan terus berlanjut di latar belakang.
            </span>
          </div>

          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              onClick={cancelActiveJob}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '5px 12px', color: '#b91c1c' }}
            >
              Batalkan Analisis Ini
            </button>
          </div>
        </div>
      )}

      {step === 3 && processedCase && (
        <div className="clean-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={22} color="#16a34a" />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading)' }}>Hasil Analisis ANCHOR VI Selesai</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID Kasus: {processedCase.id} · {processedCase.analysisPipelineBuild || 'Pipeline build siap'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetForNewUpload}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '5px 12px' }}
            >
              <RefreshCw size={13} /> Analisis Video Lain
            </button>
          </div>

          {processedCase.analysisStatus === 'no_candidate_contact' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px', marginBottom: '14px', borderRadius: '8px', background: '#fff7ed', color: '#9a3412' }}>
              <AlertTriangle size={18} /><span style={{ fontSize: '0.82rem' }}>Video selesai diproses, tetapi belum ditemukan pasangan yang memenuhi bukti kandidat kontak. Analisis kecepatan seluruh kendaraan tetap dijalankan terpisah.</span>
            </div>
          )}

          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>Jenis kejadian: {display(variables.crashType)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', fontSize: '0.8rem' }}>
              <div><span style={labelStyle}>Pasangan: </span><strong>{display(variables.roadUserPair)}</strong></div>
              <div><span style={labelStyle}>Kecepatan impak: </span><strong>{display(variables.impactSpeed, ' km/jam')}</strong></div>
              <div><span style={labelStyle}>Sudut pendekatan: </span><strong>{display(variables.impactAngle, '°')}</strong></div>
              <div><span style={labelStyle}>Indikasi risiko benturan: </span><strong>{display(variables.severityCategory || variables.crashSeverity)}</strong></div>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {variables.severityBasis || variables.speedWarning || 'Kategori risiko hanya dapat dihitung jika Impact Speed metrik tersedia.'}
          </p>

          <div style={{ marginBottom: '14px', borderRadius: '8px', overflow: 'hidden', background: '#0f172a', border: '1px solid var(--border-light)' }}>
            <video
              controls
              playsInline
              preload="auto"
              key={processedCase.videoUrl}
              style={{ width: '100%', maxHeight: '380px', display: 'block', background: '#0f172a' }}
            >
              {processedCase.videoUrl && <source src={processedCase.videoUrl} type="video/mp4" />}
              Browser Anda tidak mendukung pemutar video HTML5. Silakan download video menggunakan tombol di bawah.
            </video>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {processedCase.aiLogs.join(' · ')}
              </div>
              {processedCase.videoUrl && (
                <a
                  href={`${processedCase.videoUrl}?download=true`}
                  download={`ANCHOR_VI_${processedCase.id || 'analysis'}.mp4`}
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} /> Download Video Analisis (MP4)
                </a>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', fontSize: '0.8rem', marginBottom: '14px' }}>
            <section style={cardStyle}><strong style={{ display: 'block', marginBottom: '8px', color: 'var(--primary)' }}>A. Konfigurasi Kecelakaan</strong><div style={itemStyle}>1. Jenis kejadian: <strong>{display(variables.crashType)}</strong></div><div style={itemStyle}>2. Pasangan pengguna jalan: <strong>{display(variables.roadUserPair)}</strong></div><div style={itemStyle}>Kendaraan 1 (ID {display(variables.vehicle1Id)}): <strong>{display(variables.vehicle1Role)}</strong></div><div style={itemStyle}>3. Manuver kendaraan 1: <strong>{display(variables.vehicle1Maneuver)}</strong></div><div style={itemStyle}>Kendaraan 2 (ID {display(variables.vehicle2Id)}): <strong>{display(variables.vehicle2Role)}</strong></div><div style={itemStyle}>4. Manuver kendaraan 2: <strong>{display(variables.vehicle2Maneuver)}</strong></div></section>
            <section style={cardStyle}>
              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--accent-blue)' }}>B. Dinamika Kecelakaan</strong>
              <div style={itemStyle}>5. Kecepatan V1: <strong>{display(variables.vehicle1Speed, ' km/jam')}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>Sumber: {variables.vehicle1SpeedSource === 'pre_impact_mean_0_8s' ? 'Mean 0,8 detik pra-kontak' : variables.vehicle1SpeedSource === 'unavailable' ? 'Tidak tersedia' : `Fallback — ${variables.vehicle1SpeedSourceLabel}`} ({variables.vehicle1SpeedSampleCount || 0} sampel)</div>
              </div>
              <div style={itemStyle}>Rata-rata V1 sepanjang video (ID {display(variables.vehicle1Id)}): <strong>{display(variables.vehicle1AverageSpeed, ' km/jam')}</strong></div>
              <div style={itemStyle}>6. Kecepatan V2: <strong>{display(variables.vehicle2Speed, ' km/jam')}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>Sumber: {variables.vehicle2SpeedSource === 'pre_impact_mean_0_8s' ? 'Mean 0,8 detik pra-kontak' : variables.vehicle2SpeedSource === 'unavailable' ? 'Tidak tersedia' : `Fallback — ${variables.vehicle2SpeedSourceLabel}`} ({variables.vehicle2SpeedSampleCount || 0} sampel)</div>
              </div>
              <div style={itemStyle}>Rata-rata V2 sepanjang video (ID {display(variables.vehicle2Id)}): <strong>{display(variables.vehicle2AverageSpeed, ' km/jam')}</strong></div>
              <div style={itemStyle}>7. Kecepatan relatif: <strong>{display(variables.relativeSpeed, ' km/jam')}</strong></div>
              <div style={itemStyle}>8. Kecepatan impak (closing speed): <strong>{display(variables.impactSpeed, ' km/jam')}</strong></div>
              <div style={itemStyle}>9. Sudut pendekatan: <strong>{display(variables.impactAngle, '°')}</strong></div>
              <div style={itemStyle}>10. Reaksi menghindar: <strong>{display(variables.evasiveAction)}</strong></div>
            </section>
            <section style={cardStyle}><strong style={{ display: 'block', marginBottom: '8px', color: '#dc2626' }}>C. Keparahan dan Dampak</strong><div style={itemStyle}>11. Titik benturan: <strong>{display(variables.pointOfImpact)}</strong></div><div style={itemStyle}>12. Indikasi risiko benturan: <strong>{display(variables.severityCategory || variables.crashSeverity)}</strong></div></section>
            <section style={cardStyle}><strong style={{ display: 'block', marginBottom: '8px' }}>D. Variabel Lingkungan</strong><div style={itemStyle}>13. Cuaca dan kondisi: <strong>{display(variables.weather)}</strong></div><div style={itemStyle}>Keyakinan klasifikasi: <strong>{display(variables.classificationConfidence)}</strong></div><div style={itemStyle}>Dasar penetapan V1/V2: <strong>{display(variables.roleAssignmentReason)}</strong></div><div style={itemStyle}>Status kecepatan: <strong>{statusLabel(variables.speedStatus)}</strong></div></section>
          </div>

          {processedCase.analysisStatus === 'no_candidate_contact' && (
            <p style={{ fontSize: '0.76rem', marginBottom: 10, color: 'var(--text-muted)' }}>
              Video ini tidak memenuhi bukti kandidat kontak. Kamu tetap dapat menyimpan hasil pengujiannya, tetapi hasil ini bukan kasus kecelakaan yang telah terkonfirmasi.
            </p>
          )}
          {saveError && <p role="alert" style={{ color: '#dc2626', marginBottom: 10, fontSize: '0.82rem' }}>Gagal menyimpan: {saveError}</p>}
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={resetForNewUpload}
              style={{ padding: '10px 18px', fontSize: '0.85rem' }}
            >
              Batal & Analisis Baru
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleFinish}
              disabled={isSaving}
              style={{ flex: 1, justifyContent: 'center', opacity: isSaving ? 0.6 : 1 }}
            >
              {isSaving ? 'Menyimpan ke server...' : 'Simpan hasil ke daftar kasus dashboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        className="modal-backdrop"
        onClick={(e) => {
          if (step === 2) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1180px' }}>
          {content}
        </div>
      </div>
    );
  }
  return content;
}
