const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'ex_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const mediaUrl = (path) => (path ? BASE + path : null);

export class ApiError extends Error {
  constructor(code, status, data = {}) {
    super(code);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = 'GET', body, form, auth = true } = {}) {
  const headers = {};
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError('network', 0);
  }

  // Token muddati tugasa, sessiyani tozalab, ilovaga xabar beramiz
  if (res.status === 401 && auth && token) {
    clearToken();
    window.dispatchEvent(new Event('ex:logout'));
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'server', res.status, data);
  return data;
}

export const api = {
  register: (b) => request('/auth/register', { method: 'POST', body: b, auth: false }),
  login: (b) => request('/auth/login', { method: 'POST', body: b, auth: false }),
  me: () => request('/auth/me'),
  deleteMe: () => request('/auth/me', { method: 'DELETE' }),

  reports: (params) => request(`/reports?${new URLSearchParams(params)}`),
  mine: () => request('/reports/mine'),
  report: (id) => request(`/reports/${id}`),
  events: (id) => request(`/reports/${id}/events`),
  createReport: (form) => request('/reports', { method: 'POST', form }),
  confirm: (id) => request(`/reports/${id}/confirm`, { method: 'POST' }),
  updateReport: (id, b) => request(`/reports/${id}`, { method: 'PATCH', body: b }),
  deleteReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),
  setStatus: (id, b) => request(`/reports/${id}/status`, { method: 'PATCH', body: b }),

  stats: () => request('/stats'),
  users: () => request('/admin/users'),
  setRole: (id, b) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: b }),
};
