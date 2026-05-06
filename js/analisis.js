/* 
   CLARA – Análisis Module

   Patrón Observer: Socket.IO emite eventos de progreso
   desde el backend → el frontend reacciona en tiempo real

   Patrón Strategy: el usuario elige el modelo en la UI
    */

let _selectedFile = null;
let _lastResult   = null;

/* ── Zona de carga ── */
function simulateUpload() {
  const input  = document.createElement('input');
  input.type   = 'file';
  input.accept = '.nii,.nii.gz,.dcm';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    _selectedFile = file;
    _showFileLoaded(file.name);
  };
  input.click();
}

function _showFileLoaded(nombre) {
  document.getElementById('upload-zone').style.display = 'none';
  const chip = document.querySelector('#file-loaded .file-chip');
  if (chip) chip.childNodes[0].textContent = `📄 ${nombre} `;
  document.getElementById('file-loaded').classList.remove('hidden');
}

function removeFile() {
  _selectedFile = null;
  document.getElementById('file-loaded').classList.add('hidden');
  document.getElementById('upload-zone').style.display = '';
}

/* ── Drag & Drop real ── */
function handleDrop(event) {
  event.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag');
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const nombre = file.name.toLowerCase();
  if (!nombre.endsWith('.nii') && !nombre.endsWith('.nii.gz') && !nombre.endsWith('.dcm')) {
    showToast('Formato no soportado. Usa .nii, .nii.gz o .dcm');
    return;
  }
  _selectedFile = file;
  _showFileLoaded(file.name);
}

/* ── Iniciar análisis real ── */
async function iniciarAnalisis() {
  if (!_selectedFile) {
    showToast('Primero sube una imagen MRI');
    return;
  }

  document.getElementById('modal-progress').classList.add('active');
  _setProgress(0, 'Conectando con el servidor...');

  listenAnalisisEvents({
    onStarted: (payload) => {
      console.log('[Socket] Análisis iniciado:', payload.analysisId);
      _setProgress(10, 'Imagen recibida en el servidor...');
    },
    onProgress: (payload) => {
      console.log('[Socket] Progreso:', payload.stage, payload.percent + '%');
      _setProgress(payload.percent, payload.message);
    },
    onComplete: (result) => {
      console.log('[Socket] Análisis completo:', result);
      _setProgress(100, '¡Resultado listo!');
      _lastResult = result;
      setTimeout(() => _mostrarResultados(result), 600);
    },
    onError: (payload) => {
      console.error('[Socket] Error en análisis:', payload);
      document.getElementById('modal-progress').classList.remove('active');
      showToast('Error: ' + payload.error);
    },
  });

  try {
    _setProgress(5, 'Enviando imagen...');
    const result = await ClaraAPI.uploadAndAnalyze(_selectedFile);

    // Fallback HTTP si Socket.IO no disparó onComplete
    if (!_lastResult) {
      _lastResult = result;
      _setProgress(100, '¡Resultado listo!');
      setTimeout(() => _mostrarResultados(result), 600);
    }
  } catch (error) {
    console.error('[API] Error:', error);
    document.getElementById('modal-progress').classList.remove('active');
    showToast('Error al analizar: ' + error.message);
  }
}

/* ── Renderizar resultados ── */
function _mostrarResultados(result) {
  document.getElementById('modal-progress').classList.remove('active');
  document.getElementById('prog-bar').style.width = '0%';

  const labelMap = {
    CN:  'Cognitivamente Normal',
    MCI: 'Deterioro Cognitivo Leve',
    AD:  'Enfermedad de Alzheimer',
  };
  const badgeClassMap = {
    CN:  'r-badge--normal',
    MCI: 'r-badge--mild',
    AD:  'r-badge--moderate',
  };

  const label      = result.prediction?.label      ?? result.label ?? 'CN';
  const confidence = result.prediction?.confidence ?? result.confidence ?? 0;
  const analyzedAt = result.analyzed_at ?? new Date().toISOString();
  const modelVer   = result.model_version ?? '1.0.0';

  const badge = document.getElementById('result-badge');
  if (badge) {
    badge.textContent = labelMap[label] ?? label;
    badge.className   = 'r-badge ' + (badgeClassMap[label] ?? 'r-badge--normal');
  }

  const confEl = document.getElementById('result-conf');
  if (confEl) confEl.textContent = (confidence * 100).toFixed(1) + '%';

  const fechaEl = document.getElementById('result-fecha');
  if (fechaEl) {
    fechaEl.textContent = new Date(analyzedAt).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  // Grad-CAM base64 del backend
  if (result.gradcam) {
    const gradcamImg = document.getElementById('gradcam-img');
    if (gradcamImg) {
      gradcamImg.src           = 'data:image/png;base64,' + result.gradcam;
      gradcamImg.style.display = 'block';
    }
    document.querySelector('.gradcam-mock')?.classList.add('hidden');
  }

  const techModel = document.getElementById('tech-model');
  if (techModel) techModel.textContent = 'ResNet50 + Grad-CAM (v' + modelVer + ')';

  if (result.requiresReview) {
    showToast('⚠ Confianza baja — se recomienda revisión médica', 4000);
  }
  
  document.getElementById('resultados-vacio').style.display    = 'none';
  document.getElementById('resultados-contenido').style.display = 'block';

  navigate(
    document.querySelector('[data-page="page-resultados"]'),
    'page-resultados'
  );
}

/* ── Helper de progreso ── */
function _setProgress(pct, mensaje) {
  const bar  = document.getElementById('prog-bar');
  const step = document.getElementById('prog-step');
  if (bar)  bar.style.width  = pct + '%';
  if (step) step.textContent = mensaje;
}
