// Backend FastAPI resolution + the small set of fetch helpers shared across
// components (VideoUploaderModal, ServerConfigModal, App). Centralized here
// so there's exactly one place that decides where "the backend" is.

const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost']);

// api.py serves the Dashboard build and the API from the same origin in
// deployment (see the StaticFiles mount at the bottom of api.py). So: if this
// page itself wasn't opened from localhost, and nobody has pointed Server
// Config at a different backend, assume the API lives on this same origin
// instead of the dev-only 127.0.0.1 placeholder (which would otherwise mean
// "the visitor's own machine" to a remote browser, not this server).
export function resolveApiBase(serverConfig) {
  const fallback = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001').replace(/\/+$/, '');
  const rawHost = String(serverConfig?.hostname || '').trim();
  const pageIsLocal = typeof window === 'undefined' || LOCAL_HOSTNAMES.has(window.location.hostname);

  if (!pageIsLocal && (!rawHost || LOCAL_HOSTNAMES.has(rawHost))) {
    return window.location.origin;
  }
  if (!rawHost || !serverConfig?.port) return fallback;

  const rawUrl = /^https?:\/\//i.test(rawHost) ? rawHost : `http://${rawHost}`;
  try {
    const parsed = new URL(rawUrl);
    parsed.port = String(serverConfig.port).trim();
    parsed.pathname = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.origin;
  } catch {
    return fallback;
  }
}

export async function fetchCases(apiBase) {
  const response = await fetch(`${apiBase}/api/cases`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data.cases) ? data.cases : [];
}

export async function saveCase(apiBase, newCase) {
  const response = await fetch(`${apiBase}/api/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newCase),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Penyimpanan kasus gagal (HTTP ${response.status}).`);
  return body;
}

export async function deleteCase(apiBase, caseId) {
  const response = await fetch(`${apiBase}/api/cases/${encodeURIComponent(caseId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Hapus kasus gagal (HTTP ${response.status}).`);
  return true;
}
