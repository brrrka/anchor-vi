// Backend FastAPI resolution and authenticated fetch helpers shared by components.

const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '0.0.0.0']);

export function authFetch(url, options = {}) {
  const token = localStorage.getItem('anchor_access_token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', 'Bearer ' + token);
  return fetch(url, { ...options, headers });
}

export function withAccessToken(url) {
  const token = localStorage.getItem('anchor_access_token');
  if (!token) return url;
  return `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
}

export async function login(apiBase, email, password) {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Login gagal (HTTP ${response.status}).`);
  localStorage.setItem('anchor_access_token', body.access_token);
  return body.user;
}

export function resolveApiBase(serverConfig) {
  const fallback = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001').replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    const pageHost = window.location.hostname;
    if (LOCAL_HOSTNAMES.has(pageHost)) {
      if (window.location.port === '8001') return window.location.origin;
      return `http://127.0.0.1:${serverConfig?.port || '8001'}`;
    }
    const rawHost = String(serverConfig?.hostname || '').trim();
    if (!rawHost || LOCAL_HOSTNAMES.has(rawHost)) return window.location.origin;
  }
  const rawHost = String(serverConfig?.hostname || '').trim();
  if (!rawHost || !serverConfig?.port || (!rawHost.includes('.') && !LOCAL_HOSTNAMES.has(rawHost))) return fallback;
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
  const response = await authFetch(`${apiBase}/api/cases`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data.cases) ? data.cases.map((item) => ({
    ...item,
    videoUrl: item.videoUrl && item.videoUrl.startsWith('/')
      ? withAccessToken(`${apiBase}${item.videoUrl}`)
      : item.videoUrl,
  })) : [];
}

export async function saveCase(apiBase, newCase) {
  const response = await authFetch(`${apiBase}/api/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newCase),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Penyimpanan kasus gagal (HTTP ${response.status}).`);
  return body;
}

export async function deleteCase(apiBase, caseId) {
  const response = await authFetch(`${apiBase}/api/cases/${encodeURIComponent(caseId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Hapus kasus gagal (HTTP ${response.status}).`);
  return true;
}
