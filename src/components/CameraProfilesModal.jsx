import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle, Trash2, X, Upload, MapPin, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const VIEWS = [
  ['side', 'Side View / Samping'], ['front', 'Front View / Depan'],
  ['rear', 'Rear View / Belakang'], ['diagonal', 'Diagonal / Oblique'],
  ['elevated', 'Elevated / Dari Ketinggian'], ['top', 'Top View / Dari Atas'],
  ['auto', 'Belum ditentukan'],
];

const panel = { background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 9, padding: 14 };
const label = { display: 'block', fontSize: '.76rem', color: 'var(--text-muted)', marginBottom: 5 };
const input = { width: '100%', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid var(--border-light)', borderRadius: 7, background: 'var(--bg-card)', color: 'var(--text-heading)' };

export default function CameraProfilesModal({ onClose, onSaved }) {
  const [profiles, setProfiles] = useState([]);
  const [cameraId, setCameraId] = useState('CCTV-01');
  const [cameraName, setCameraName] = useState('CCTV 01');
  const [cameraView, setCameraView] = useState('side');
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotUrl, setSnapshotUrl] = useState('');
  const [imageSize, setImageSize] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refreshProfiles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/cameras`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setProfiles(data.cameras || []);
    } catch (err) {
      setError(`Tidak dapat memuat profil CCTV: ${err.message}`);
    }
  };

  useEffect(() => { refreshProfiles(); }, []);
  useEffect(() => {
    if (!snapshot) { setSnapshotUrl(''); setImageSize(null); return; }
    const url = URL.createObjectURL(snapshot);
    setSnapshotUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [snapshot]);

  const pointReady = useMemo(() => points.length >= 4 && points.every(p => p.worldX !== '' && p.worldY !== '' && Number.isFinite(Number(p.worldX)) && Number.isFinite(Number(p.worldY))), [points]);

  const handleImageClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    setPoints(previous => [...previous, { u, v, worldX: '', worldY: '' }]);
    setError('');
  };

  const updatePoint = (index, key, value) => {
    setPoints(previous => previous.map((point, i) => i === index ? { ...point, [key]: value } : point));
  };

  const loadExisting = async (profile) => {
    setCameraId(profile.camera_id);
    setCameraName(profile.camera_name);
    setCameraView(profile.camera_view || 'auto');
    setPoints([]);
    setSnapshot(null);
    setNotice(`Profil ${profile.camera_id} dipilih. Unggah frame kalibrasi baru jika ingin memperbarui titik metrik.`);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError(''); setNotice('');
    const cleanId = cameraId.trim();
    if (!cleanId) { setError('ID kamera wajib diisi.'); return; }
    if (snapshot && !imageSize) { setError('Tunggu sampai gambar kalibrasi selesai dimuat.'); return; }
    if (points.length > 0 && points.length < 4) { setError('Kalibrasi metrik membutuhkan minimal 4 titik.'); return; }
    if (points.length > 0 && !pointReady) { setError('Isi koordinat X dan Y dalam meter untuk setiap titik yang dipilih.'); return; }

    const payload = {
      camera_name: cameraName.trim() || cleanId,
      camera_view: cameraView,
      image_size: imageSize || null,
      calibration: points.length >= 4 ? {
        mode: 'ground_plane_points',
        image_points_normalized: points.map(p => [p.u, p.v]),
        world_points_m: points.map(p => [Number(p.worldX), Number(p.worldY)]),
      } : { mode: 'pixel_only' },
    };

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/cameras/${encodeURIComponent(cleanId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      await refreshProfiles();
      setNotice(data.calibration?.status === 'calibrated_reference'
        ? `Profil ${cleanId} tersimpan. Homography valid; RMSE ${data.calibration.reprojection_rmse_m} m.`
        : `Profil ${cleanId} tersimpan sebagai metadata kamera. Kecepatan km/jam belum terkalibrasi.`);
      if (onSaved) onSaved(data.profile);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan profil kamera.');
    } finally { setLoading(false); }
  };

  const deleteProfile = async (id) => {
    if (!window.confirm(`Hapus profil kamera ${id}?`)) return;
    try {
      const response = await fetch(`${API_BASE}/api/cameras/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      await refreshProfiles();
      setNotice(`Profil ${id} dihapus.`);
      if (cameraId === id) { setCameraId(''); setCameraName(''); setPoints([]); setSnapshot(null); }
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 1040, width: 'min(1040px, 96vw)', maxHeight: '92vh', overflowY: 'auto', position: 'relative', padding: 22 }}>
        <button onClick={onClose} aria-label="Tutup" style={{ position: 'absolute', right: 16, top: 16, border: 0, background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 5 }}><Camera size={20}/> Profil CCTV & Kalibrasi Per Kamera</h2>
        <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>Setiap kamera memiliki profil dan transformasi metrik sendiri. Profil tidak boleh dipakai silang antar-CCTV.</p>
        {error && <div role="alert" style={{ ...panel, color: '#b91c1c', marginBottom: 10 }}>{error}</div>}
        {notice && <div role="status" style={{ ...panel, color: 'var(--text-heading)', marginBottom: 10 }}>{notice}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, .8fr)', gap: 16 }}>
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <section style={panel}>
              <strong style={{ display: 'block', marginBottom: 10, fontSize: '.88rem' }}>Identitas Kamera</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={label}>ID kamera unik</label><input style={input} value={cameraId} onChange={e => setCameraId(e.target.value)} placeholder="CCTV-GERBANG-01" required /></div>
                <div><label style={label}>Nama kamera</label><input style={input} value={cameraName} onChange={e => setCameraName(e.target.value)} placeholder="CCTV Gerbang Utama" /></div>
              </div>
              <div style={{ marginTop: 10 }}><label style={label}>Perspektif kamera</label><select style={input} value={cameraView} onChange={e => setCameraView(e.target.value)}>{VIEWS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>
            </section>

            <section style={panel}>
              <strong style={{ display: 'block', marginBottom: 7, fontSize: '.88rem' }}>Gambar Referensi CCTV</strong>
              <p style={{ fontSize: '.74rem', color: 'var(--text-muted)', marginBottom: 9 }}>Unggah satu frame/screenshot dari kamera yang sama. Rasio aspek harus sama dengan video yang akan dianalisis. Klik 4–8 titik di permukaan jalan yang koordinat fisiknya dapat diukur.</p>
              <label style={{ ...input, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><Upload size={15}/> {snapshot ? snapshot.name : 'Pilih gambar referensi (JPG/PNG)'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { setSnapshot(e.target.files?.[0] || null); setPoints([]); }} style={{ display: 'none' }}/></label>
              {snapshotUrl && <div style={{ marginTop: 10, border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden', background: '#111827' }}>
                <div style={{ position: 'relative', cursor: 'crosshair', lineHeight: 0 }}>
                  <img src={snapshotUrl} alt="Frame CCTV untuk kalibrasi" onLoad={e => setImageSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} onClick={handleImageClick} style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}/>
                  {points.map((p, i) => <div key={i} style={{ position: 'absolute', left: `${p.u * 100}%`, top: `${p.v * 100}%`, transform: 'translate(-50%,-50%)', width: 25, height: 25, borderRadius: '50%', background: '#facc15', color: '#111827', border: '2px solid #111827', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, lineHeight: 1 }}>{i + 1}</div>)}
                </div>
                <div style={{ padding: 8, fontSize: '.72rem', color: '#e5e7eb' }}>{imageSize ? `${imageSize.width} × ${imageSize.height} px` : 'Membaca resolusi gambar...' } · {points.length} titik dipilih</div>
              </div>}
              {points.length > 0 && <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: '.76rem', fontWeight: 700 }}>Pasangan koordinat jalan (meter)</div>
                {points.map((p, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '42px 1fr 1fr auto', gap: 7, alignItems: 'center' }}>
                  <strong style={{ fontSize: '.78rem' }}>P{i + 1}</strong>
                  <input style={input} type="number" step="any" value={p.worldX} onChange={e => updatePoint(i, 'worldX', e.target.value)} placeholder="X (m)" aria-label={`P${i + 1} X meter`}/>
                  <input style={input} type="number" step="any" value={p.worldY} onChange={e => updatePoint(i, 'worldY', e.target.value)} placeholder="Y (m)" aria-label={`P${i + 1} Y meter`}/>
                  <button type="button" onClick={() => setPoints(old => old.filter((_, j) => j !== i))} title="Hapus titik" style={{ border: 0, background: 'none', color: '#dc2626', cursor: 'pointer' }}><X size={16}/></button>
                </div>)}
                <p style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Gunakan satu titik sebagai origin (0,0), lalu masukkan koordinat hasil pengukuran nyata untuk titik lainnya. Jangan mengisi jarak berdasarkan perkiraan visual.</p>
              </div>}
            </section>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <button className="btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center' }}><CheckCircle size={15}/>{loading ? 'Menyimpan...' : 'Simpan Profil Kamera'}</button>
              <button className="btn-secondary" type="button" onClick={() => { setPoints([]); setSnapshot(null); setImageSize(null); }} style={{ justifyContent: 'center' }}>Reset Titik</button>
            </div>
          </form>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <section style={panel}>
              <strong style={{ display: 'block', fontSize: '.88rem', marginBottom: 8 }}>Profil CCTV Tersimpan</strong>
              <button className="btn-secondary" onClick={refreshProfiles} type="button" style={{ marginBottom: 9 }}><RefreshCw size={13}/> Muat ulang</button>
              {profiles.length === 0 ? <p style={{ fontSize: '.76rem', color: 'var(--text-muted)' }}>Belum ada profil kamera.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profiles.map(profile => <div key={profile.camera_id} style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 10, background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div><strong style={{ fontSize: '.8rem' }}>{profile.camera_name}</strong><div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{profile.camera_id} · {profile.camera_view}</div><div style={{ fontSize: '.7rem', marginTop: 3, color: profile.calibration_status === 'calibrated_reference' ? '#15803d' : '#b45309' }}>{profile.calibration_status === 'calibrated_reference' ? `Terkalibrasi · ${profile.point_count} titik` : 'Belum ada skala metrik'}</div></div>
                    <button type="button" onClick={() => deleteProfile(profile.camera_id)} title="Hapus profil" style={{ border: 0, background: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={15}/></button>
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => loadExisting(profile)} style={{ marginTop: 8, width: '100%', justifyContent: 'center', fontSize: '.72rem' }}>Gunakan profil ini</button>
                </div>)}
              </div>}
            </section>
            <section style={{ ...panel, fontSize: '.75rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--text-heading)' }}>Panduan ilmiah kalibrasi</strong>
              <ul style={{ margin: '7px 0 0 17px', padding: 0 }}>
                <li>Gunakan minimal 4 titik non-segaris; 6–8 titik tersebar lebih baik.</li>
                <li>Semua titik harus berada pada bidang jalan yang sama.</li>
                <li>Setiap koordinat X/Y harus berasal dari pengukuran jarak nyata dalam meter.</li>
                <li>Profil hanya berlaku untuk kamera tetap, resolusi/aspek yang cocok, dan area jalan yang dikalibrasi.</li>
                <li>Jika kamera bergeser, zoom, atau berubah sudut, kalibrasi ulang.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
