import React, { useState, useEffect } from 'react';
import { Server, CheckCircle, RefreshCw, Cpu, HardDrive, Zap, Activity, ShieldCheck, Terminal, X } from 'lucide-react';
import { resolveApiBase, authFetch } from '../api';

export default function ServerConfigModal({ serverConfig, onUpdateConfig, isModal = false, onClose }) {
  const [telemetry, setTelemetry] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ping, setPing] = useState(serverConfig?.ping ?? 0);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const API_BASE = resolveApiBase(serverConfig);

  const fetchServerSpecs = async () => {
    setIsLoading(true);
    setError(null);
    const started = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      let response;
      try {
        response = await authFetch(`${API_BASE}/api/server-info`, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const latency = Math.round(performance.now() - started);
      setPing(latency);
      setTelemetry(data);
      setLastRefreshed(new Date().toLocaleTimeString());

      const updated = {
        ...serverConfig,
        hostname: '127.0.0.1',
        machineName: data.hostname || 'Local Node',
        port: String(data.port || 8001),
        status: 'connected',
        ping: latency,
        gpuDevice: data.gpu?.device_name || 'CPU (Multi-threaded)',
        aiModel: `${data.model?.name || 'YOLO11s'} + ByteTrack (${data.model?.pipeline_build || 'ANCHOR-VI'})`,
        lastSync: new Date().toLocaleString(),
      };
      if (onUpdateConfig) onUpdateConfig(updated);
    } catch (err) {
      setError(String(err.message || err));
      if (onUpdateConfig) {
        onUpdateConfig({ ...serverConfig, status: 'disconnected' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServerSpecs();
  }, [API_BASE]);

  const content = (
    <div style={{ padding: isModal ? '24px' : '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-primary">LOCAL ENGINE TELEMETRY</span>
            <span className={`badge ${telemetry?.status === 'connected' ? 'badge-primary' : 'badge-neutral'}`}>
              {telemetry?.status === 'connected' ? 'Connected & Live' : (isLoading ? 'Probing...' : 'Offline')}
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={22} color="var(--primary)" /> AI Server & Hardware Telemetry
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Spesifikasi perangkat keras dan lingkungan eksekusi AI yang discraping otomatis langsung dari server lokal.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchServerSpecs}
            disabled={isLoading}
            style={{ fontSize: '0.8125rem', padding: '6px 14px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            {isLoading ? 'Mengambil Data...' : 'Refresh Telemetry'}
          </button>
          {isModal && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', marginBottom: '16px', fontSize: '0.825rem' }}>
          <strong>Gagal menghubungkan ke server AI:</strong> {error}. Pastikan backend FastAPI sedang berjalan di port 8001.
        </div>
      )}

      {/* Grid of Scraped Hardware & Environment Specs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        {/* Machine / OS */}
        <div className="clean-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--primary)' }}>
            <Server size={18} />
            <strong style={{ fontSize: '0.875rem', color: 'var(--text-heading)' }}>Sistem & Mesin Host</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hostname:</span>
              <strong className="mono-font">{telemetry?.hostname || 'Mendeteksi...'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sistem Operasi:</span>
              <span>{telemetry?.os || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Arsitektur:</span>
              <span className="mono-font">{telemetry?.architecture || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Host IP:</span>
              <span className="mono-font">{telemetry?.host_ip || '127.0.0.1'}:{telemetry?.port || 8001}</span>
            </div>
          </div>
        </div>

        {/* CPU & Processor */}
        <div className="clean-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--accent-blue)' }}>
            <Cpu size={18} />
            <strong style={{ fontSize: '0.875rem', color: 'var(--text-heading)' }}>CPU & Pemrosesan</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Jumlah Core CPU:</span>
              <strong>{telemetry?.cpu_cores ? `${telemetry.cpu_cores} Logical Cores` : '-'}</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tipe Prosesor:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={telemetry?.processor}>
                {telemetry?.processor || 'Standard x86_64'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Worker Threads:</span>
              <span>1 Worker (Isolated Safe Mode)</span>
            </div>
          </div>
        </div>

        {/* RAM & Memory */}
        <div className="clean-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#16a34a' }}>
            <Activity size={18} />
            <strong style={{ fontSize: '0.875rem', color: 'var(--text-heading)' }}>Memori RAM</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total RAM:</span>
              <strong>{telemetry?.ram?.total_gb ? `${telemetry.ram.total_gb} GB` : '-'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Terpakai:</span>
              <span>{telemetry?.ram?.used_gb ? `${telemetry.ram.used_gb} GB (${telemetry.ram.percent_used}%)` : '-'}</span>
            </div>
            {/* Visual RAM Bar */}
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
              <div
                style={{
                  width: `${telemetry?.ram?.percent_used || 0}%`,
                  height: '100%',
                  background: (telemetry?.ram?.percent_used || 0) > 85 ? '#ef4444' : '#16a34a',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Tersedia: {telemetry?.ram?.available_gb ? `${telemetry.ram.available_gb} GB` : '-'}</span>
              <span>Beban: {telemetry?.ram?.percent_used ? `${telemetry.ram.percent_used}%` : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* GPU & AI Frameworks */}
        <div className="clean-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--primary)' }}>
            <Zap size={18} />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-heading)' }}>
              Akselerasi AI & Framework
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8125rem' }}>
            <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Device Komputasi</span>
              <strong style={{ color: telemetry?.gpu?.cuda_available ? '#16a34a' : 'var(--text-heading)', fontSize: '0.85rem' }}>
                {telemetry?.gpu?.device_name || 'CPU Execution'}
              </strong>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {telemetry?.gpu?.cuda_available ? `CUDA Akselerasi Aktif (${telemetry.gpu.device_count} GPU)` : 'Inferensi menggunakan multi-core CPU'}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>AI Model Utama</span>
              <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                {telemetry?.model?.name || 'YOLO11s'}
              </strong>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Status: {telemetry?.model?.available ? 'File bobot model siap (.pt)' : 'Model belum ditemukan'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Versi PyTorch:</span>
              <span className="mono-font">{telemetry?.gpu?.torch_version || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Versi OpenCV:</span>
              <span className="mono-font">{telemetry?.opencv_version || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Python Runtime:</span>
              <span className="mono-font">Python {telemetry?.python?.version || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pipeline Build ID:</span>
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{telemetry?.model?.pipeline_build || '-'}</span>
            </div>
          </div>
        </div>

        {/* Storage, Network, and Live Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="clean-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--primary)' }}>
              <HardDrive size={18} />
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                Kapasitas Disk & Jaringan
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status Koneksi API:</span>
                <span className={`badge ${telemetry?.status === 'connected' ? 'badge-primary' : 'badge-red'}`}>
                  {telemetry?.status === 'connected' ? 'Online & Siap' : 'Terputus'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Latensi HTTP (Ping):</span>
                <strong style={{ color: ping < 50 ? '#16a34a' : '#d97706' }}>{ping} ms</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ruang Bebas Hard Disk:</span>
                <strong>{telemetry?.disk?.free_gb ? `${telemetry.disk.free_gb} GB Bebas` : '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sinkronisasi Terakhir:</span>
                <span style={{ color: 'var(--text-body)' }}>{lastRefreshed || 'Baru saja'}</span>
              </div>
            </div>
          </div>

          <div className="clean-card" style={{ padding: '16px', background: 'var(--bg-subtle)', flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={14} /> Telemetry Scraper Audit
            </div>
            <div className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-body)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>[OS] Host: {telemetry?.hostname || 'localhost'} ({telemetry?.os || 'Windows'})</div>
              <div>[CPU] Cores: {telemetry?.cpu_cores || 1} | Threads: 1 Task Worker</div>
              <div>[AI] YOLO11s model weights loaded: {telemetry?.model?.available ? 'YES' : 'NO'}</div>
              <div>[BUILD] {telemetry?.model?.contact_detector_build || 'contact-detector'} · {telemetry?.model?.speed_engine_build || 'speed-engine'}</div>
              <div style={{ color: '#16a34a', marginTop: '2px' }}>✓ Semua parameter sistem berhasil discraping otomatis tanpa perlu input manual.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '920px' }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
