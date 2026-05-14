/*
  CLARA – API Client
  Toda la comunicación con el backend va por aquí.

  Backend (Node/Express):  http://localhost:3000
  AI Service (FastAPI):    http://localhost:8000
  Socket.IO:               http://localhost:3000
*/

const BACKEND_URL = 'http://localhost:3000';
const API_BASE    = `${BACKEND_URL}/api/v1`;

// ── Gestión de sesión (localStorage) ────────────────────────────────────────

const Session = {
  setSession(token, refreshToken, user) {
    localStorage.setItem('clara_token',   token);
    localStorage.setItem('clara_refresh', refreshToken);
    localStorage.setItem('clara_user',    JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('clara_token');
    localStorage.removeItem('clara_refresh');
    localStorage.removeItem('clara_user');
  },
  getToken()    { return localStorage.getItem('clara_token'); },
  getRefresh()  { return localStorage.getItem('clara_refresh'); },
  getUser()     {
    const u = localStorage.getItem('clara_user');
    return u ? JSON.parse(u) : null;
  },
  isLoggedIn()  { return !!this.getToken(); },
};

// ── Helpers internos ─────────────────────────────────────────────────────────

async function _postJSON(url, body) {
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || `Error ${res.status}`);
  return json;
}

async function _authFetch(url, options = {}) {
  const token   = Session.getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res  = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    Session.clearSession();
    window.location.reload();
    return;
  }
  if (!res.ok) throw new Error(json.message || json.error || `Error ${res.status}`);
  return json;
}

// ── ClaraAPI ─────────────────────────────────────────────────────────────────

const ClaraAPI = {

  // ── Autenticación ──────────────────────────────────────────────────────────

  auth: {

    async login(email, password) {
      const json = await _postJSON(`${API_BASE}/auth/login`, { email, password });
      Session.setSession(json.data.token, json.data.refreshToken, json.data.user);
      return json.data;
    },

    async register(nombre, apellido, email, password) {
      return await _postJSON(`${API_BASE}/auth/register`, { nombre, apellido, email, password });
    },

    async forgotPassword(email) {
      return await _postJSON(`${API_BASE}/auth/forgot-password`, { email });
    },

    async logout() {
      const refreshToken = Session.getRefresh();
      if (refreshToken) {
        await _postJSON(`${API_BASE}/auth/logout`, { refreshToken }).catch(() => {});
      }
      Session.clearSession();
    },

    async getMe() {
      return await _authFetch(`${API_BASE}/auth/me`);
    },

    async updateMe(data) {
      return await _authFetch(`${API_BASE}/auth/me`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
    },

    async changePassword(currentPassword, newPassword) {
      return await _authFetch(`${API_BASE}/auth/me/password`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ passwordActual: currentPassword, 
      passwordNuevo:  newPassword  }),
    });
  },
},

  // ── Análisis ───────────────────────────────────────────────────────────────

  async uploadAndAnalyze(file) {
    const formData = new FormData();
    formData.append('mriFile', file);

    const token   = Session.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/analysis/upload`, {
      method: 'POST',
      headers,
      body:   formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }
    const json = await response.json();
    return json.data;
  },

  async health() {
    const response = await fetch(`${API_BASE}/analysis/health`);
    return await response.json();
  },

  // ── Historial ──────────────────────────────────────────────────────────────

  async getHistory(limit = 20, offset = 0) {
    const json = await _authFetch(`${API_BASE}/history?limit=${limit}&offset=${offset}`);
    return json.data;
  },

  async getHistoryStats() {
    const json = await _authFetch(`${API_BASE}/history/stats`);
    return json.data;
  },

  async getHistoryById(id) {
    const json = await _authFetch(`${API_BASE}/history/${id}`);
    return json.data;
  },

  async deleteHistoryEntry(id) {
    return await _authFetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
  },
};

// ── Socket.IO ─────────────────────────────────────────────────────────────────

let _socket = null;

function initSocket() {
  if (_socket) return _socket;

  if (typeof io === 'undefined') {
    console.warn('[Socket] socket.io no está cargado.');
    return null;
  }

  const token = Session.getToken();
  _socket = io(BACKEND_URL, {
    transports:          ['websocket', 'polling'],
    reconnection:        true,
    reconnectionAttempts: 5,
    reconnectionDelay:   2000,
    auth:                token ? { token } : {},
  });

  _socket.on('connect',        ()      => console.log('[Socket] Conectado:', _socket.id));
  _socket.on('service:status', (data)  => console.log('[Socket] Estado servicio:', data));
  _socket.on('disconnect',     (reason)=> console.warn('[Socket] Desconectado:', reason));
  _socket.on('connect_error',  (err)   => console.error('[Socket] Error:', err.message));

  return _socket;
}

function listenAnalisisEvents({ onStarted, onProgress, onComplete, onError }) {
  const socket = initSocket();
  if (!socket) return;

  socket.off('analysis:started');
  socket.off('analysis:progress');
  socket.off('analysis:complete');
  socket.off('analysis:error');

  if (onStarted)  socket.on('analysis:started',  onStarted);
  if (onProgress) socket.on('analysis:progress', onProgress);
  if (onComplete) socket.on('analysis:complete',  onComplete);
  if (onError)    socket.on('analysis:error',     onError);
}

function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
