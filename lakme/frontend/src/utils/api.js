// Use axios' browser build to avoid webpack/node core polyfill issues
// Lightweight fetch-based API wrapper to avoid bundling node-only modules (axios pulls node adapters)
const defaultHost = window.location.hostname;
const BASE = 'https://lakme-backend-4y1r.onrender.com/api';
function authHeaders() {
  const token = localStorage.getItem('lakme_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleRes(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText || 'API Error');
    err.status = res.status;
    err.serverMessage = data?.message;
    throw err;
  }
  return { data };
}

const API = {
  async request(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) };
    const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });
    return handleRes(res);
  },
  get(path) { return API.request(path, { method: 'GET' }); },
  post(path, body) { return API.request(path, { method: 'POST', body: JSON.stringify(body) }); },
  put(path, body) { return API.request(path, { method: 'PUT', body: JSON.stringify(body) }); },
  delete(path) { return API.request(path, { method: 'DELETE' }); },
};

export default API;
