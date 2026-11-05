import React, { useState } from 'react';
import { Server, CheckCircle, RefreshCw, Eye, EyeOff, Terminal, X } from 'lucide-react';
import { resolveApiBase } from '../api';

export default function ServerConfigModal({ serverConfig, onUpdateConfig, isModal = false, onClose }) {
  const [formData, setFormData] = useState({ ...serverConfig });
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testLogs, setTestLogs] = useState([]);
  // Simpan URL yang telah diverifikasi; jangan menganggap form otomatis terhubung.
  const [verifiedOrigin, setVerifiedOrigin] = useState(null);

  const serverOrigin = resolveApiBase;

  // Tes koneksi sesungguhnya ke FastAPI, bukan log simulasi.
  const handleTestConnection = async () => {
    setIsTesting(true);
    const origin = serverOrigin(formData);
    setTestLogs([`Memeriksa ${origin}/api/health ...`]);
    const started = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let response;
      try {
        response = await fetch(`${origin}/api/health`, {signal: controller.signal});
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (body.status !== 'ok') throw new Error('Respons health tidak valid');
      const ping = Math.round(performance.now() - started);
      const confirmed = { ...formData, status: 'connected', ping, lastSync: new Date().toLocaleString() };
      setFormData(confirmed);
      setVerifiedOrigin(origin);
      setTestLogs([
        `Koneksi berhasil: ${origin}`,
        `API version: ${body.api_version || 'Tidak dilaporkan'}`,
        `Pipeline: ${body.analysis_pipeline_build || 'Tidak dilaporkan'}`,
        `YOLO11s model ditemukan: ${body.model_available ? 'Ya' : 'Tidak'}`,
        `Latency HTTP: ${ping} ms`,
      ]);
      onUpdateConfig(confirmed);
    } catch (error) {
      const failed = { ...formData, status: 'disconnected' };
      setFormData(failed);
      setVerifiedOrigin(null);
      onUpdateConfig(failed);
      setTestLogs([`GAGAL: ${origin}`, String(error.message || error), 'Pastikan FastAPI aktif pada port yang dipilih.']);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    // Simpan alamat; Connected hanya berasal dari tes health yang benar.
    onUpdateConfig({ ...formData, status: verifiedOrigin === serverOrigin(formData) ? 'connected' : 'disconnected' });
    if (onClose) onClose();
  };

  const content = (
    <div style={{ padding: isModal ? '24px' : '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={20} color="var(--primary)" /> AI Server Connection Settings
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Configure connection parameters for the remote AI processing node.
          </p>
        </div>
        {isModal && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Connection Form */}
        <form onSubmit={handleSave} className="clean-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '14px', borderBottom: '1px solid var(--border-light)', pb: '8px' }}>
            Server Credentials
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Hostname / IP</label>
              <input
                type="text"
                className="form-input mono-font"
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value, status: 'disconnected' })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Port</label>
              <input
                type="text"
                className="form-input mono-font"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value, status: 'disconnected' })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input mono-font"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input mono-font"
                style={{ width: '100%', paddingRight: '36px' }}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">GPU Acceleration Node</label>
            <select className="form-select" value={formData.gpuDevice} onChange={(e) => setFormData({ ...formData, gpuDevice: e.target.value })}>
              <option value="Nvidia GeForce RTX 4090 (24GB VRAM)">Nvidia GeForce RTX 4090 (24GB VRAM)</option>
              <option value="Nvidia A100 Tensor Core (80GB VRAM)">Nvidia A100 Tensor Core (80GB VRAM)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Computer Vision Pipeline</label>
            <select className="form-select" value={formData.aiModel} onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}>
              <option value="YOLOv8x + DeepSORT v2.4 + TrajectoryNet">YOLOv8x + DeepSORT v2.4 + TrajectoryNet</option>
              <option value="YOLOv9 + ByteTrack + Trajectory Extraction">YOLOv9 + ByteTrack + Trajectory Extraction</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={handleTestConnection} disabled={isTesting} style={{ flex: 1, justifyContent: 'center' }}>
              <RefreshCw size={14} /> {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <CheckCircle size={14} /> Save & Apply
            </button>
          </div>
        </form>

        {/* Server Telemetry & Console Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="clean-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '12px' }}>
              Server Telemetry
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span className={`badge ${formData.status === 'connected' ? 'badge-primary' : 'badge-red'}`}>
                  {formData.status === 'connected' ? 'Connected' : 'Offline'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ping Latency</span>
                <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{formData.ping} ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>GPU Usage</span>
                <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{formData.gpuUsage}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>VRAM Allocation</span>
                <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{formData.vramUsed} / {formData.vramTotal} GB</span>
              </div>
            </div>
          </div>

          <div className="clean-card" style={{ padding: '16px', background: 'var(--bg-subtle)', color: 'var(--text-heading)', flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={12} /> Connection Log Output
            </div>
            <div className="mono-font" style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {testLogs.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Click "Test Connection" to check remote server handshake...
                </span>
              ) : (
                testLogs.map((log, idx) => <div key={idx}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
