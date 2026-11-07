import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import OverviewTab from './components/OverviewTab';
import CrashDatabaseTab from './components/CrashDatabaseTab';
import VideoUploaderModal from './components/VideoUploaderModal';
import ServerConfigModal from './components/ServerConfigModal';
import CaseDetailModal from './components/CaseDetailModal';
import AseanProtocolTab from './components/AseanProtocolTab';
import { INITIAL_SERVER_CONFIG } from './data/dummyCases';
import { resolveApiBase, fetchCases, saveCase, deleteCase, authFetch } from './api';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('anchor_theme') || 'light');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('anchor_user');
    return saved && localStorage.getItem('anchor_access_token') ? JSON.parse(saved) : null;
  });
  const [serverConfig, setServerConfig] = useState(() => {
    const saved = localStorage.getItem('anchor_server_config');
    let cfg = saved ? JSON.parse(saved) : INITIAL_SERVER_CONFIG;
    // Sanitasi hostname jika sebelumnya sempat tersimpan nama mesin lokal (NetBIOS)
    if (cfg?.hostname && (cfg.hostname.toLowerCase() === 'asphyxia' || !cfg.hostname.includes('.'))) {
      cfg.hostname = '127.0.0.1';
    }
    return { ...INITIAL_SERVER_CONFIG, ...cfg, status: 'disconnected' };
  });
  // Cases persist server-side (SQLite via /api/cases) so the crash database
  // survives a backend restart and is shared across browsers/devices,
  // instead of being trapped in one browser's localStorage.
  const [cases, setCases] = useState([]);
  const [casesLoadError, setCasesLoadError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [lastSavedJobId, setLastSavedJobId] = useState(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCase, setSelectedCase] = useState(null);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadState, setUploadState] = useState({ isRunning: false, progress: 0, step: 1, currentStepText: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('anchor_theme', theme);
  }, [theme]);
  useEffect(() => {
    if (user) localStorage.setItem('anchor_user', JSON.stringify(user));
    else localStorage.removeItem('anchor_user');
  }, [user]);
  useEffect(() => localStorage.setItem('anchor_server_config', JSON.stringify(serverConfig)), [serverConfig]);

  const apiBase = resolveApiBase(serverConfig);
  useEffect(() => {
    let active = true;
    fetchCases(apiBase)
      .then((loaded) => { if (active) { setCases(loaded); setCasesLoadError(''); } })
      .catch((error) => {
        if (active) {
          if (error.message.includes('HTTP 401')) {
            localStorage.removeItem('anchor_user');
            localStorage.removeItem('anchor_access_token');
            setUser(null);
          }
          setCasesLoadError(`Tidak dapat memuat daftar kasus dari backend: ${error.message}`);
        }
      });
    return () => { active = false; };
    // apiBase hanya berubah saat Server Config disimpan ulang; sengaja tidak
    // auto-refetch tiap render supaya tidak membanjiri backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverConfig.hostname, serverConfig.port]);

  // Tombol simpan tetap idempotent untuk kompatibilitas; job selesai sudah
  // dipersist otomatis oleh backend dan callback memperbarui daftar lokal.
  const handleSaveNewCase = async (newCase) => {
    if (!newCase?.id || !newCase?.jobId) {
      throw new Error('Hasil analisis belum memiliki ID kasus/job yang valid.');
    }

    const saved = await saveCase(apiBase, newCase);
    const next = [saved, ...cases.filter((item) => item.jobId !== newCase.jobId)];

    setCases(next);
    setSelectedCase(null);
    setIsUploadModalOpen(false);
    setLastSavedJobId(newCase.jobId);
    setActiveTab('database');
    const isNoContact = newCase.analysisStatus === 'no_candidate_contact';
    setSaveNotice(isNoContact
      ? 'Hasil pengujian tersimpan di server (tanpa kandidat kontak, bukan bukti kecelakaan).'
      : 'Hasil analisis berhasil tersimpan di server (database kasus).');
    return true;
  };
  const handleCaseAutoSaved = (newCase) => {
    setCases((current) => [
      newCase,
      ...current.filter((item) => item.jobId !== newCase.jobId),
    ]);
  };
  const handleDeleteCase = async (caseItem) => {
    if (!window.confirm(`Hapus history ${caseItem.id}? Video hasil analisis juga akan dihapus.`)) return;
    try {
      await deleteCase(apiBase, caseItem.id);
      setCases((current) => current.filter((item) => item.id !== caseItem.id));
      if (selectedCase?.id === caseItem.id) setSelectedCase(null);
      setSaveNotice(`History ${caseItem.id} berhasil dihapus.`);
    } catch (error) {
      setCasesLoadError(`History tidak dapat dihapus: ${error.message}`);
    }
  };
  const toggleTheme = () => setTheme((previous) => previous === 'light' ? 'dark' : 'light');

  if (!user) return <LoginPage apiBase={apiBase} onLoginSuccess={setUser} theme={theme} onToggleTheme={toggleTheme} />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', color: 'var(--text-body)' }}>
      <Navbar
        user={user}
        serverConfig={serverConfig}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenServerConfig={() => setIsServerModalOpen(true)}
        onOpenUploadModal={() => {
          setActiveTab('upload');
          setIsUploadModalOpen(false);
        }}
        onLogout={() => {
          localStorage.removeItem('anchor_access_token');
          setUser(null);
        }}
        uploadState={uploadState}
        onNavigateToUpload={() => setActiveTab('upload')}
      />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} totalCases={cases.length} uploadState={uploadState} />
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          {casesLoadError && (
            <div role="alert" style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid #dc2626', color: '#dc2626' }}>
              {casesLoadError}
              <button type="button" aria-label="Tutup pemberitahuan" onClick={() => setCasesLoadError('')} style={{ marginLeft: 12, cursor: 'pointer' }}>×</button>
            </div>
          )}
          {saveNotice && (
            <div role="status" style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', color: 'var(--text-heading)' }}>
              {saveNotice}
              <button type="button" aria-label="Tutup pemberitahuan" onClick={() => setSaveNotice('')} style={{ marginLeft: 12, cursor: 'pointer' }}>×</button>
            </div>
          )}
          {activeTab === 'overview' && <OverviewTab
            cases={cases}
            onSelectCase={setSelectedCase}
            onOpenUploadModal={() => {
              setActiveTab('upload');
              setIsUploadModalOpen(false);
            }}
            onOpenServerConfig={() => setIsServerModalOpen(true)}
            serverConfig={serverConfig}
          />}
          {activeTab === 'database' && <CrashDatabaseTab key={lastSavedJobId || 'library'} cases={cases} onSelectCase={setSelectedCase} onDeleteCase={handleDeleteCase} />}

          {/* Tab Upload dijaga tetap mount di DOM dengan display: none agar proses upload tidak pernah terhenti/ter-unmount saat pengguna berpindah tab */}
          <div style={{ display: activeTab === 'upload' ? 'block' : 'none' }}>
            <VideoUploaderModal
              serverConfig={serverConfig}
              onSaveNewCase={handleSaveNewCase}
              onCaseAutoSaved={handleCaseAutoSaved}
              isModal={false}
              onUploadStateChange={setUploadState}
            />
          </div>

          {activeTab === 'asean' && <AseanProtocolTab />}
          {activeTab === 'server' && <ServerConfigModal serverConfig={serverConfig} onUpdateConfig={setServerConfig} isModal={false} />}
        </main>
      </div>
      {selectedCase && <CaseDetailModal selectedCase={selectedCase} onClose={() => setSelectedCase(null)} />}
      {isServerModalOpen && <ServerConfigModal serverConfig={serverConfig} onUpdateConfig={setServerConfig} isModal onClose={() => setIsServerModalOpen(false)} />}
      {isUploadModalOpen && <VideoUploaderModal serverConfig={serverConfig} onSaveNewCase={handleSaveNewCase} onCaseAutoSaved={handleCaseAutoSaved} isModal onClose={() => setIsUploadModalOpen(false)} />}
    </div>
  );
}
