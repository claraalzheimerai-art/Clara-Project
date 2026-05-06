/* 
   CLARA – API Client
   Toda la comunicación con el backend va por aquí.

   Backend (Node/Express):  http://localhost:3000
   AI Service (FastAPI):    http://localhost:8000
   Socket.IO:               http://localhost:3000

   Endpoints reales:
     POST /api/v1/analysis/upload  → subir imagen + analizar
     GET  /api/v1/analysis/health  → estado del sistema
     GET  /api/v1/history          → historial de análisis
     GET  /api/v1/history/stats    → estadísticas
     GET  /api/v1/history/:id      → análisis por ID
     DELETE /api/v1/history/:id    → eliminar entrada
   */

const BACKEND_URL = 'http://localhost:3000';
const API_BASE    = `${BACKEND_URL}/api/v1`;

/* ── Patrón Facade: una sola interfaz para todos los servicios ── */
const ClaraAPI = {

  /* ─────────────────────────────────────────
     ANÁLISIS: subir imagen MRI y obtener
     diagnóstico + Grad-CAM del backend
     ───────────────────────────────────────── */
  async uploadAndAnalyze(file) {
    const formData = new FormData();
    formData.append('mriFile', file);   // ← campo que espera el backend

    const response = await fetch(`${API_BASE}/analysis/upload`, {
      method: 'POST',
      body: formData,
      // NO poner Content-Type: el browser lo pone solo con el boundary correcto
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }

    const json = await response.json();
    return json.data; // EnrichedAnalysisResult
  },

  /* ─────────────────────────────────────────
     HEALTH: verificar que backend + AI estén
     en línea antes de permitir análisis
     ───────────────────────────────────────── */
  async health() {
    const response = await fetch(`${API_BASE}/analysis/health`);
    return await response.json();
  },

  /* ─────────────────────────────────────────
     HISTORIAL
     ───────────────────────────────────────── */
  async getHistory(limit = 20, offset = 0) {
    const response = await fetch(
      `${API_BASE}/history?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error('Error cargando historial');
    const json = await response.json();
    return json.data;
  },

  async getHistoryStats() {
    const response = await fetch(`${API_BASE}/history/stats`);
    if (!response.ok) throw new Error('Error cargando estadísticas');
    const json = await response.json();
    return json.data;
  },

  async getHistoryById(id) {
    const response = await fetch(`${API_BASE}/history/${id}`);
    if (!response.ok) throw new Error('Análisis no encontrado');
    const json = await response.json();
    return json.data;
  },

  async deleteHistoryEntry(id) {
    const response = await fetch(`${API_BASE}/history/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error eliminando entrada');
    return await response.json();
  },
};

/* ── Socket.IO – eventos en tiempo real (Observer) ──
   El backend emite estos eventos durante el análisis:
     analysis:started   → { analysisId, filename, startedAt }
     analysis:progress  → { analysisId, stage, message, percent }
     analysis:complete  → EnrichedAnalysisResult completo
     analysis:error     → { analysisId, error, code }
   ───────────────────────────────────────────────── */

let _socket = null;

/**
 * Inicializa la conexión Socket.IO con el backend.
 * Llama esto una vez después del login.
 * Requiere tener socket.io.js cargado en el HTML.
 */
function initSocket() {
  if (_socket) return _socket;

  /* Requiere: <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script> */
  if (typeof io === 'undefined') {
    console.warn('[Socket] socket.io no está cargado. Agrega el script al HTML.');
    return null;
  }

  _socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  _socket.on('connect', () => {
    console.log('[Socket] Conectado al backend:', _socket.id);
  });

  _socket.on('service:status', (data) => {
    console.log('[Socket] Estado del servicio:', data);
  });

  _socket.on('disconnect', (reason) => {
    console.warn('[Socket] Desconectado:', reason);
  });

  _socket.on('connect_error', (err) => {
    console.error('[Socket] Error de conexión:', err.message);
  });

  return _socket;
}

/**
 * Registra listeners para los eventos de un análisis específico.
 * @param {Object} callbacks
 * @param {Function} callbacks.onStarted   - (payload) cuando inicia
 * @param {Function} callbacks.onProgress  - (payload) { stage, message, percent }
 * @param {Function} callbacks.onComplete  - (result) EnrichedAnalysisResult
 * @param {Function} callbacks.onError     - (payload) { error, code }
 */
function listenAnalisisEvents({ onStarted, onProgress, onComplete, onError }) {
  const socket = initSocket();
  if (!socket) return;

  // Limpiar listeners anteriores para no acumularlos
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
