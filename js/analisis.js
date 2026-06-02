/*  CLARA – Análisis Module  */

let _selectedFile = null;
let _lastResult   = null;

/* ── Interceptar navegación a Resultados para cargar la lista ── */
(function () {
  const _origNavigate = window.navigate;
  window.navigate = function (btn, pageId) {
    _origNavigate(btn, pageId);
    if (pageId === 'page-resultados') {
      _cargarListaResultados();
    }
  };
})();

/* ── Zona de carga ── */
function simulateUpload() {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.nii,.nii.gz,.dcm,.img,.zip';
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

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag');
  const file   = event.dataTransfer.files[0];
  if (!file) return;
  const nombre = file.name.toLowerCase();
  const valido = nombre.endsWith('.nii')    ||
                 nombre.endsWith('.nii.gz') ||
                 nombre.endsWith('.dcm')    ||
                 nombre.endsWith('.img')    ||
                 nombre.endsWith('.zip');
  if (!valido) {
    showToast('Formato no soportado. Usa .nii, .nii.gz, .dcm, .img o .zip');
    return;
  }
  _selectedFile = file;
  _showFileLoaded(file.name);
}

/* ── Iniciar análisis ── */
async function iniciarAnalisis() {
  if (!_selectedFile) { showToast('Primero sube una imagen MRI'); return; }

  document.getElementById('modal-progress').classList.add('active');
  _setProgress(0, 'Conectando con el servidor...');

  listenAnalisisEvents({
    onStarted:  (p) => { console.log('[Socket] iniciado:', p.analysisId); _setProgress(10, 'Imagen recibida...'); },
    onProgress: (p) => { _setProgress(p.percent, p.message); },
    onComplete: (r) => {
      _lastResult = r;
      _setProgress(100, '¡Resultado listo!');
      setTimeout(() => _mostrarResultados(r), 600);
    },
    onError: (p) => {
      document.getElementById('modal-progress').classList.remove('active');
      showToast('Error: ' + p.error);
    },
  });

  try {
    _setProgress(5, 'Enviando imagen...');
    const result = await ClaraAPI.uploadAndAnalyze(_selectedFile);
    if (!_lastResult) {
      _lastResult = result;
      _setProgress(100, '¡Resultado listo!');
      setTimeout(() => _mostrarResultados(result), 600);
    }
  } catch (error) {
    document.getElementById('modal-progress').classList.remove('active');
    showToast('Error al analizar: ' + error.message);
  }
}

/* ── Navegar a detalle después de un análisis nuevo ─────────────
   Usa NavegacionMenu.goTo directamente para no disparar el hook
   que mostraría la lista.                                        */
function _mostrarResultados(result) {
  document.getElementById('modal-progress').classList.remove('active');
  document.getElementById('prog-bar').style.width = '0%';

  _mostrarVista('resultados-contenido');
  _poblarResultados(result);

  // Activar nav sin disparar el hook de la lista
  NavegacionMenu.init();
  NavegacionMenu.goTo(document.querySelector('[data-page="page-resultados"]'), 'page-resultados');
}

/* ── Cargar y mostrar la lista de historial ── */
async function _cargarListaResultados() {
  _mostrarVista('resultados-lista');
  const container = document.getElementById('history-list-container');
  container.innerHTML = '<p style="color:var(--gray-muted); text-align:center; padding:40px 0;">Cargando historial...</p>';

  try {
    const { entries } = await ClaraAPI.getHistory(100, 0);

    if (!entries || entries.length === 0) {
      _mostrarVista('resultados-vacio');
      return;
    }

    container.innerHTML = entries.map(e => _htmlEntryCard(e)).join('');

  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444; text-align:center; padding:40px 0;">Error al cargar historial: ${err.message}</p>`;
  }
}

/* ── Ver el detalle de una entrada del historial ── */
async function verResultado(analysisId) {
  _mostrarVista('resultados-contenido');

  // Limpiar imágenes anteriores mientras carga
  _resetImagenDetalle();

  try {
    const entry = await ClaraAPI.getHistoryById(analysisId);
    _poblarResultados(entry);
  } catch (err) {
    showToast('Error cargando resultado: ' + err.message);
    volverALista();
  }
}

/* ── Volver a la lista ── */
function volverALista() {
  _cargarListaResultados();
}

/* ── Poblar la vista de detalle con un resultado ── */
function _poblarResultados(result) {
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

  // Normaliza EnrichedAnalysisResult (análisis nuevo) y HistoryDetailEntry (desde BD)
  const label      = result.prediction?.label      ?? result.label      ?? 'CN';
  const confidence = result.prediction?.confidence ?? result.confidence ?? 0;
  const analyzedAt = result.analyzed_at ?? result.analyzedAt           ?? new Date().toISOString();
  const modelVer   = result.model_version ?? result.modelVersion        ?? '1.0.0';

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

  const techModel = document.getElementById('tech-model');
  if (techModel) techModel.textContent = 'ResNet50 + Grad-CAM (v' + modelVer + ')';

  // Imagen MRI original
  const mriImg         = document.getElementById('mri-img');
  const mriPlaceholder = document.getElementById('mri-placeholder');
  if (result.mri_image && mriImg) {
    mriImg.src           = 'data:image/png;base64,' + result.mri_image;
    mriImg.style.display = 'block';
    if (mriPlaceholder) mriPlaceholder.style.display = 'none';
  }

  // Mapa de calor Grad-CAM
  const gradcamImg         = document.getElementById('gradcam-img');
  const gradcamPlaceholder = document.getElementById('gradcam-placeholder');
  if (result.gradcam && gradcamImg) {
    gradcamImg.src           = 'data:image/png;base64,' + result.gradcam;
    gradcamImg.style.display = 'block';
    if (gradcamPlaceholder) gradcamPlaceholder.style.display = 'none';
  }

  if (result.requiresReview) {
    showToast('⚠ Confianza baja — se recomienda revisión médica', 4000);
  }
}

/* ── Helpers internos ── */

function _mostrarVista(vistaId) {
  ['resultados-vacio', 'resultados-lista', 'resultados-contenido'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === vistaId) {
      el.style.display = id === 'resultados-vacio' ? 'flex' : 'block';
    } else {
      el.style.display = 'none';
    }
  });
}

function _resetImagenDetalle() {
  const mriImg = document.getElementById('mri-img');
  if (mriImg) { mriImg.src = ''; mriImg.style.display = 'none'; }
  const mriPh  = document.getElementById('mri-placeholder');
  if (mriPh)  mriPh.style.display = '';

  const gcImg  = document.getElementById('gradcam-img');
  if (gcImg)  { gcImg.src = ''; gcImg.style.display = 'none'; }
  const gcPh   = document.getElementById('gradcam-placeholder');
  if (gcPh)   gcPh.style.display = '';
}

function _htmlEntryCard(e) {
  const badgeClass = { CN: 'r-badge--normal', MCI: 'r-badge--mild', AD: 'r-badge--moderate' }[e.label] ?? 'r-badge--normal';
  const fecha = new Date(e.analyzedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  const conf  = (e.confidence * 100).toFixed(1) + '%';
  const review = e.requiresReview
    ? '<span style="font-size:11px; color:#f59e0b; margin-left:8px;">⚠ Revisión recomendada</span>'
    : '';

  return `
    <div onclick="verResultado('${e.analysisId}')"
         style="background:var(--white); border:1px solid var(--border); border-radius:12px;
                padding:16px 20px; display:flex; align-items:center; gap:16px;
                margin-bottom:10px; cursor:pointer; transition:box-shadow .15s;"
         onmouseenter="this.style.boxShadow='0 2px 12px rgba(0,0,0,.08)'"
         onmouseleave="this.style.boxShadow='none'">
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${e.filename}${review}
        </div>
        <div style="font-size:12px; color:var(--gray-muted); margin-top:3px;">${fecha}</div>
      </div>
      <span class="r-badge ${badgeClass}" style="white-space:nowrap;">${e.diagnosticLabel}</span>
      <div style="font-size:14px; font-weight:600; min-width:48px; text-align:right;">${conf}</div>
      <button onclick="event.stopPropagation(); verResultado('${e.analysisId}')"
              class="btn-cta" style="padding:6px 14px; font-size:13px; white-space:nowrap;">
        Ver resultado
      </button>
    </div>`;
}

function _setProgress(pct, mensaje) {
  const bar  = document.getElementById('prog-bar');
  const step = document.getElementById('prog-step');
  if (bar)  bar.style.width  = pct + '%';
  if (step) step.textContent = mensaje;
}
