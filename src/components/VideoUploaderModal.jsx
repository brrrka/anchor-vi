import React, { useEffect, useState } from 'react';
import { Upload, Film, CheckCircle, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { resolveApiBase } from '../api';
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

  const calibratedProfiles = (Array.isArray(profiles) ? profiles : [])
    .filter((profile) => profile?.calibration_status === 'calibrated_reference');

  const matches = calibratedProfiles.filter((profile) => {
    const cameraId = normalizeCameraKey(profile.camera_id);
    const cameraName = normalizeCameraKey(profile.camera_name);

    return (
      (cameraId && (locationKey === cameraId || locationKey.includes(cameraId) || cameraId.includes(locationKey))) ||
      (cameraName && (locationKey === cameraName || locationKey.includes(cameraName) || cameraName.includes(locationKey)))
    );
  });

  // Jangan memilih secara acak jika lebih dari satu profil cocok.
  return matches.length === 1 ? matches[0] : null;
}
const statusLabel = (status) => ({
  calibrated_reference: 'Terkalibrasi dengan referensi meter',
  estimated_prior: 'Estimasi prior geometri — keyakinan rendah',
  uncalibrated: 'Belum terkalibrasi — hanya px/s',
  mixed: 'Status kalibrasi V1/V2 berbeda',
}[status] || 'Tidak tersedia');

export default function VideoUploaderModal({ serverConfig, onSaveNewCase, isModal = false, onClose }) {
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

  // Profil kamera dimuat di belakang layar. Tidak ada panel pemilihan/import
  // kalibrasi pada halaman upload.
  useEffect(() => {
    let active = true;

    fetch(`${API_BASE}/api/cameras`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setCameraProfiles(Array.isArray(data.cameras) ? data.cameras : []);
      })
      .catch((err) => {
        // Upload dan analisis tetap dapat berjalan tanpa profil metrik.
        console.warn(`[ANCHOR VI] Profil kamera tidak dapat dimuat: ${err.message}`);
        if (active) setCameraProfiles([]);
      });

    return () => { active = false; };
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

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('location_name', locationName || 'Lokasi CCTV tidak diketahui');
      formData.append('country', country);
      formData.append('weather', weather);
      formData.append('lighting', lighting);
      formData.append('road_surface', roadSurface);
      // User-facing workflow is AUTO: no camera-angle selection or manual point drawing.
      formData.append('camera_view', 'auto');
      formData.append('speed_mode', 'both');
      formData.append('calibration_mode', 'auto');

      // Gunakan profil metrik hanya jika nama/ID kamera pada metadata cocok
      // secara unik dengan profil terkalibrasi yang tersimpan di backend.
      let profilesForUpload = cameraProfiles;
      if (!profilesForUpload.length) {
        try {
          const profilesResponse = await fetch(`${API_BASE}/api/cameras`);
          if (profilesResponse.ok) {
            const profilesData = await profilesResponse.json();
            profilesForUpload = Array.isArray(profilesData.cameras) ? profilesData.cameras : [];
            setCameraProfiles(profilesForUpload);
          }
        } catch (profileLoadError) {
          console.warn(`[ANCHOR VI] Gagal memuat profil kamera saat upload: ${profileLoadError.message}`);
        }
      }

      const matchingProfile = findMatchingCalibratedProfile(profilesForUpload, locationName);
      if (matchingProfile?.camera_id) {
        formData.append('camera_id', matchingProfile.camera_id);
      }

      const uploadResponse = await fetch(`${API_BASE}/api/analyze`, { method: 'POST', body: formData });
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadResult.detail || 'Unggah video gagal.');
      const jobId = uploadResult.job_id;
      let job = null;
      let attempts = 0;
      while (attempts < 3600) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts += 1;
        const statusResponse = await fetch(`${API_BASE}/api/jobs/${jobId}`);
        if (!statusResponse.ok) throw new Error('Tidak dapat mengambil status pemrosesan dari backend.');
        job = await statusResponse.json();
        setProgress(Number(job.progress || 0));
        setCurrentStepText(job.message || 'Backend sedang menganalisis video...');
        if (job.status === 'failed') throw new Error(job.message || 'Analisis backend gagal.');
        if (job.status === 'completed') break;
      }
      if (!job || job.status !== 'completed') throw new Error('Waktu pemrosesan melewati batas tunggu dashboard.');

      const matrix = job.matrix_13 || {};
      const flagMap = { Indonesia: '🇮🇩', Malaysia: '🇲🇾', Thailand: '🇹🇭', Vietnam: '🇻🇳' };
      const crashType = matrix.crash_type || job.crash_type || 'Belum dapat diklasifikasikan';
      const roadUserPair = matrix.road_user_pair || 'Mobil – Mobil';
      const primaryEvent = job.primary_event || null;
      const newCase = {
        id: `KASUS-${jobId.slice(0, 8).toUpperCase()}`,
        jobId,
        apiBaseUsed: API_BASE,
        title: `${locationName} - ${crashType}`,
        location: locationName,
        country,
        flag: flagMap[country] || '🇮🇩',
        date: new Date().toLocaleString('id-ID'),
        roadUserPair,
        crashType,
        confidenceScore: null,
        videoUrl: job.video_url ? `${API_BASE}${job.video_url}` : null,
        variables: {
          crashType, roadUserPair,
          vehicle1Id: matrix.vehicle1_id, vehicle2Id: matrix.vehicle2_id,
          vehicle1Role: matrix.vehicle1_role, vehicle2Role: matrix.vehicle2_role,
          vehicle1Maneuver: matrix.vehicle1_maneuver, vehicle2Maneuver: matrix.vehicle2_maneuver,
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
          weather: matrix.weather_conditions,
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
        // API already limits these to the primary candidate V1/V2.
        vehicleSpeedSummaries: job.vehicle_speed_summaries || [],
        vehicleSpeedProfiles: job.vehicle_speed_profiles || [],
        calibration: job.calibration || {},
        analysisPipelineBuild: job.analysis_pipeline_build || null,
        backendApiVersion: job.api_version || null,
        aiLogs: [
          `Video: ${file.name}`,
          `FPS sumber: ${job.fps ?? 'Tidak tersedia'}`,
          `Jumlah frame diproses: ${job.processed_frames ?? 0}`,
          job.message || '', job.video_codec_note || '',
        ].filter(Boolean),
        analysisStatus: job.candidate_event_count > 0 ? 'potential_contact_found' : 'no_candidate_contact',
      };
      setProcessedCase(newCase);
      setProgress(100);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat menganalisis video.');
      setStep(1);
    }
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
      setSaveError('Tombol simpan belum terhubung ke App.jsx (onSaveNewCase tidak tersedia).');
      return;
    }
    setIsSaving(true);
    try {
      // App.jsx menyimpan ke backend (/api/cases, SQLite) lalu mengarahkan ke daftar kasus.
      await onSaveNewCase(processedCase);
      if (onClose) onClose();
    } catch (saveError) {
      setSaveError(saveError?.message || 'Penyimpanan kasus gagal.');
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>Backend FastAPI: <strong>{API_BASE}</strong> · YOLO11s + ByteTrack · Speed Engine BOTH · Kalibrasi AUTO</p>
        </div>
        {isModal && <button onClick={onClose} aria-label="Tutup" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>}
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
            <p style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sistem menganalisis seluruh kendaraan dan tujuh skenario Car–Car ANCHOR VI. Pengguna tidak perlu memilih angle CCTV atau menggambar titik kalibrasi.</p>
          </div>

          <div className="clean-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '12px' }}>Metadata Video</h3>
            <div className="form-group">
              <label className="form-label">Lokasi CCTV</label>
              <input type="text" className="form-input" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                Jika profil metrik kamera sudah tersimpan, sertakan nama atau ID kamera pada kolom ini agar sistem dapat mencocokkannya otomatis.
              </p>
            </div>
            <div className="form-group"><label className="form-label">Negara</label><select className="form-select" value={country} onChange={(e) => setCountry(e.target.value)}><option value="Indonesia">Indonesia</option><option value="Malaysia">Malaysia</option><option value="Thailand">Thailand</option><option value="Vietnam">Vietnam</option></select></div>
            <div className="form-group"><label className="form-label">Cuaca</label><select className="form-select" value={weather} onChange={(e) => setWeather(e.target.value)}><option value="Unknown">Tidak diketahui</option><option value="Clear">Cerah</option><option value="Overcast">Berawan</option><option value="Rain">Hujan</option><option value="Fog">Berkabut</option></select></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group"><label className="form-label">Pencahayaan</label><select className="form-select" value={lighting} onChange={(e) => setLighting(e.target.value)}><option value="Unknown">Tidak diketahui</option><option value="Daylight">Siang hari</option><option value="Dusk/Dawn">Senja/fajar</option><option value="Night">Malam hari</option></select></div>
              <div className="form-group"><label className="form-label">Permukaan jalan</label><select className="form-select" value={roadSurface} onChange={(e) => setRoadSurface(e.target.value)}><option value="Unknown">Tidak diketahui</option><option value="Dry">Kering</option><option value="Wet">Basah</option><option value="Snow/Ice">Bersalju/ber-es</option></select></div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              <strong style={{ color: 'var(--text-heading)' }}>Pengaturan otomatis:</strong><br />
              • Perspektif CCTV: Auto<br />• Speed analysis: V1 dan V2 pada kandidat kontak<br />• Kalibrasi: profil metrik yang cocok dengan nama/ID kamera digunakan otomatis jika tersedia
            </div>
            <button type="submit" className="btn-primary" disabled={!file} style={{ width: '100%', justifyContent: 'center', marginTop: '10px', opacity: file ? 1 : 0.5 }}>Analisis Video</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="clean-card" style={{ padding: '32px', textAlign: 'center' }}>
          <RefreshCw size={28} color="var(--primary)" className="spin-icon" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '8px' }}>Sedang menganalisis video CCTV</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>{currentStepText}</p>
          <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden', maxWidth: '440px', margin: '0 auto' }}><div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} /></div>
          <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{progress}%</div>
        </div>
      )}

      {step === 3 && processedCase && (
        <div className="clean-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <CheckCircle size={22} color="#16a34a" />
            <div><h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading)' }}>Hasil Analisis ANCHOR VI</h3><p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID Kasus: {processedCase.id} · {processedCase.analysisPipelineBuild || 'Pipeline build belum tersedia'}</p></div>
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
          {variables.impactSpeed == null && (
            <div style={{ padding: '10px', marginBottom: '12px', borderRadius: '8px', background: '#fff7ed', color: '#9a3412', fontSize: '0.78rem' }}>
              Impact Speed belum tersedia. Pastikan tersedia profil metrik untuk kamera tersebut (nama/ID pada Lokasi CCTV harus cocok), dua kendaraan terlacak, dan kandidat kontak ditemukan.
            </div>
          )}

          <video controls preload="metadata" style={{ width: '100%', maxHeight: '340px', background: '#111827', marginBottom: '10px' }} src={processedCase.videoUrl || undefined} />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>{processedCase.aiLogs.join(' · ')}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', fontSize: '0.8rem', marginBottom: '14px' }}>
            <section style={cardStyle}><strong style={{ display: 'block', marginBottom: '8px', color: 'var(--primary)' }}>A. Konfigurasi Kecelakaan</strong><div style={itemStyle}>1. Jenis kejadian: <strong>{display(variables.crashType)}</strong></div><div style={itemStyle}>2. Pasangan pengguna jalan: <strong>{display(variables.roadUserPair)}</strong></div><div style={itemStyle}>Kendaraan 1 (ID {display(variables.vehicle1Id)}): <strong>{display(variables.vehicle1Role)}</strong></div><div style={itemStyle}>3. Manuver kendaraan 1: <strong>{display(variables.vehicle1Maneuver)}</strong></div><div style={itemStyle}>Kendaraan 2 (ID {display(variables.vehicle2Id)}): <strong>{display(variables.vehicle2Role)}</strong></div><div style={itemStyle}>4. Manuver kendaraan 2: <strong>{display(variables.vehicle2Maneuver)}</strong></div></section>
            <section style={cardStyle}>
              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--accent-blue)' }}>B. Dinamika Kecelakaan</strong>
              <div style={itemStyle}>5. Kecepatan V1: <strong>{display(variables.vehicle1Speed, ' km/jam')}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>Sumber: {variables.vehicle1SpeedSource === 'pre_impact_mean_0_8s' ? 'Mean 0,8 detik pra-kontak' : variables.vehicle1SpeedSource === 'unavailable' ? 'Tidak tersedia' : `Fallback — ${variables.vehicle1SpeedSourceLabel}`} ({variables.vehicle1SpeedSampleCount || 0} sampel)</div>
                {variables.vehicle1SpeedSource === 'fallback_mean_whole_video_not_preimpact' && <div style={{ color: '#b45309', fontSize: '0.72rem' }}>Hanya untuk informasi kecepatan; TIDAK digunakan untuk Relative/Impact Speed. {variables.vehicle1SpeedDiagnostics?.reason}</div>}
              </div>
              <div style={itemStyle}>Rata-rata V1 sepanjang video (ID {display(variables.vehicle1Id)}): <strong>{display(variables.vehicle1AverageSpeed, ' km/jam')}</strong></div>
              <div style={itemStyle}>6. Kecepatan V2: <strong>{display(variables.vehicle2Speed, ' km/jam')}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>Sumber: {variables.vehicle2SpeedSource === 'pre_impact_mean_0_8s' ? 'Mean 0,8 detik pra-kontak' : variables.vehicle2SpeedSource === 'unavailable' ? 'Tidak tersedia' : `Fallback — ${variables.vehicle2SpeedSourceLabel}`} ({variables.vehicle2SpeedSampleCount || 0} sampel)</div>
                {variables.vehicle2SpeedSource === 'fallback_mean_whole_video_not_preimpact' && <div style={{ color: '#b45309', fontSize: '0.72rem' }}>Hanya untuk informasi kecepatan; TIDAK digunakan untuk Relative/Impact Speed. {variables.vehicle2SpeedDiagnostics?.reason}</div>}
              </div>
              <div style={itemStyle}>Rata-rata V2 sepanjang video (ID {display(variables.vehicle2Id)}): <strong>{display(variables.vehicle2AverageSpeed, ' km/jam')}</strong></div>
              <div style={itemStyle}>7. Kecepatan relatif: <strong>{display(variables.relativeSpeed, ' km/jam')}</strong></div>
              <div style={itemStyle}>8. Kecepatan impak (closing speed): <strong>{display(variables.impactSpeed, ' km/jam')}</strong></div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginBottom: '8px' }}>Sumber vektor pasangan: {variables.pairSpeedSource === 'pre_impact_mean_0_8s' ? 'Mean 0,8 detik pra-kontak' : variables.pairSpeedSource === 'unavailable' ? 'Tidak ada vektor serempak yang kompatibel' : `Fallback — ${variables.pairSpeedSourceLabel}`} ({variables.pairSpeedSampleCount || 0} frame bersama)</div>
              {variables.pairSpeedDiagnostic && <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{variables.pairSpeedDiagnostic}</div>}
              <div style={itemStyle}>9. Sudut pendekatan: <strong>{display(variables.impactAngle, '°')}</strong></div>
              <div style={itemStyle}>10. Reaksi menghindar: <strong>{display(variables.evasiveAction)}</strong></div>
            </section>
            <section style={cardStyle}><strong style={{ display: 'block', marginBottom: '8px', color: '#dc2626' }}>C. Keparahan dan Dampak</strong><div style={itemStyle}>11. Titik benturan: <strong>{display(variables.pointOfImpact)}</strong></div><div style={itemStyle}>12. Indikasi risiko benturan: <strong>{display(variables.severityCategory || variables.crashSeverity)}</strong></div></section>
            <section style={cardStyle}><strong style={{ display: 'block', marginBottom: '8px' }}>D. Variabel Lingkungan</strong><div style={itemStyle}>13. Cuaca dan kondisi: <strong>{display(variables.weather)}</strong></div><div style={itemStyle}>Keyakinan klasifikasi: <strong>{display(variables.classificationConfidence)}</strong></div><div style={itemStyle}>Dasar penetapan V1/V2: <strong>{display(variables.roleAssignmentReason)}</strong></div><div style={itemStyle}>Status kecepatan: <strong>{statusLabel(variables.speedStatus)}</strong></div><div style={itemStyle}>Dasar severity: <strong>{display(variables.severityBasis)}</strong></div></section>
          </div>

          {processedCase.analysisStatus === 'no_candidate_contact' && (
            <p style={{ fontSize: '0.76rem', marginBottom: 10, color: 'var(--text-muted)' }}>
              Video ini tidak memenuhi bukti kandidat kontak. Kamu tetap dapat menyimpan hasil pengujiannya, tetapi hasil ini bukan kasus kecelakaan yang telah terkonfirmasi.
            </p>
          )}
          {saveError && <p role="alert" style={{ color: '#dc2626', marginBottom: 10, fontSize: '0.82rem' }}>Gagal menyimpan: {saveError}</p>}
          <button type="button" className="btn-primary" onClick={handleFinish} disabled={isSaving} style={{ width: '100%', justifyContent: 'center', opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Menyimpan ke server...' : 'Simpan hasil ke daftar kasus dashboard'}</button>
        </div>
      )}
    </div>
  );

  if (isModal) return <div className="modal-backdrop" onClick={onClose}><div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1180px' }}>{content}</div></div>;
  return content;
}
