// API client. The access token lives in memory only; the refresh token is an httpOnly cookie.
let accessToken = null;
let refreshPromise = null;
let authLostHandler = () => {};

export const onAuthLost = (fn) => { authLostHandler = fn; };

async function toError(res) {
  let message = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (typeof data.detail === 'string') message = data.detail;
    else if (Array.isArray(data.detail)) {
      message = data.detail
        .map((e) => `${(e.loc || []).slice(1).join(' › ') || 'input'}: ${e.msg.replace(/^Value error, /, '')}`)
        .join('; ');
    }
  } catch { /* non-JSON body */ }
  const err = new Error(message);
  err.status = res.status;
  return err;
}

// One shared in-flight refresh, so concurrent 401s don't rotate the token twice.
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw await toError(res);
        const data = await res.json();
        accessToken = data.access_token;
        return data;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function request(path, { method = 'GET', body, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method, headers, credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      await refreshSession();
      return request(path, { method, body, retry: false });
    } catch {
      accessToken = null;
      authLostHandler();
      throw new Error('Your session has expired. Please sign in again.');
    }
  }
  if (!res.ok) throw await toError(res);
  return res.status === 204 ? null : res.json();
}

const take = (data) => { accessToken = data.access_token; return data; };

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }).then(take),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }).then(take),
  logout: async () => { try { await request('/auth/logout', { method: 'POST' }); } finally { accessToken = null; } },

  summary: () => request('/dashboard/summary'),

  roles: () => request('/roles'),
  departments: () => request('/departments'),
  createDepartment: (b) => request('/departments', { method: 'POST', body: b }),
  updateDepartment: (id, b) => request(`/departments/${id}`, { method: 'PUT', body: b }),
  deleteDepartment: (id) => request(`/departments/${id}`, { method: 'DELETE' }),

  designations: () => request('/designations'),
  createDesignation: (b) => request('/designations', { method: 'POST', body: b }),
  updateDesignation: (id, b) => request(`/designations/${id}`, { method: 'PUT', body: b }),

  users: () => request('/users'),
  createUser: (b) => request('/users', { method: 'POST', body: b }),
  updateUser: (id, b) => request(`/users/${id}`, { method: 'PATCH', body: b }),
};
