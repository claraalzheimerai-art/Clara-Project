/*
  CLARA – Auth Module
  Conecta los formularios de la UI con los endpoints reales del backend.

  Endpoints usados:
    POST /api/v1/auth/login           → loginSuccess()
    POST /api/v1/auth/register        → registerSuccess()
    POST /api/v1/auth/forgot-password → recoverySuccess()
    POST /api/v1/auth/logout          → logout()
    GET  /api/v1/auth/me              → checkSession() (al cargar la página)
*/

// ── Navegación entre pantallas de auth ───────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.auth-wrap')
    .forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function _setLoading(btn, loading) {
  btn.disabled   = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? 'Cargando...' : btn.dataset.originalText;
}

function _showApp(user) {
  document.querySelectorAll('.auth-wrap').forEach(el => el.classList.add('hidden'));
  document.getElementById('app').classList.remove('hidden');
  initSocket();
  navigate(document.querySelector('[data-page="page-dashboard"]'), 'page-dashboard');
  cargarPerfil();

  // Mostrar nombre en sidebar si hay elemento para ello
  const sidebarUser = document.getElementById('sidebar-user');
  if (sidebarUser && user) sidebarUser.textContent = `${user.nombre} ${user.apellido}`;
  
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function loginSuccess() {
  const emailEl = document.getElementById('login-email');
  const passEl  = document.getElementById('login-pass');
  const btn     = document.querySelector('#screen-login .btn-primary');

  const email    = emailEl?.value.trim();
  const password = passEl?.value.trim();

  if (!email) { showToast('Ingresa tu correo electrónico'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Ingresa un correo válido'); return; }
  if (!password) { showToast('Ingresa tu contraseña'); return; }

  _setLoading(btn, true);
  try {
    const { user } = await ClaraAPI.auth.login(email, password);
    _showApp(user);
  } catch (err) {
    const msg = err.message || 'Error al iniciar sesión';
    if (msg.includes('verificar')) {
      showToast('Debes verificar tu correo antes de iniciar sesión', 4000);
    } else {
      showToast(msg);
    }
  } finally {
    _setLoading(btn, false);
  }
}

// ── Registro ──────────────────────────────────────────────────────────────────

async function registerSuccess() {
  const nombre      = document.getElementById('reg-nombre')?.value.trim();
  const apellido    = document.getElementById('reg-apellido')?.value.trim();
  const telefono    = document.getElementById('reg-telefono')?.value.trim();
  const especialidad = document.getElementById('reg-especialidad')?.value;
  const email       = document.getElementById('reg-email')?.value.trim();
  const password    = document.getElementById('reg-password')?.value;
  const confirmar   = document.getElementById('reg-confirm')?.value;
  const btn         = document.querySelector('#screen-register .btn-primary');

  if (!nombre)       { showToast('El nombre es obligatorio');               return; }
  if (!apellido)     { showToast('El apellido es obligatorio');             return; }
  if (!telefono)     { showToast('El teléfono es obligatorio');             return; }
  if (!especialidad) { showToast('Selecciona una especialidad');            return; }
  if (!email)        { showToast('El correo es obligatorio');               return; }
  if (!password)     { showToast('La contraseña es obligatoria');          return; }
  if (password.length < 8) { showToast('La contraseña debe tener mínimo 8 caracteres'); return; }
  if (password !== confirmar) { showToast('Las contraseñas no coinciden'); return; }

  _setLoading(btn, true);
  try {
    await ClaraAPI.auth.register(nombre, apellido, email, password);
    openModal('modal-register');

    document.getElementById('reg-nombre').value      = '';
    document.getElementById('reg-apellido').value    = '';
    document.getElementById('reg-telefono').value    = '';
    document.getElementById('reg-especialidad').value = '';
    document.getElementById('reg-email').value       = '';
    document.getElementById('reg-password').value    = '';
    document.getElementById('reg-confirm').value     = '';

  } catch (err) {
    const msg = err.message || 'Error al crear cuenta';
    if (msg.includes('registrado')) {
      showToast('Este correo ya está registrado');
    } else {
      showToast(msg);
    }
  } finally {
    _setLoading(btn, false);
  }
}

// ── Recuperación de contraseña ────────────────────────────────────────────────

async function recoverySuccess() {
  const correoEl = document.querySelector('#screen-recovery input[type="email"]');
  const btn      = document.querySelector('#screen-recovery .btn-primary');
  const email    = correoEl?.value.trim();

  if (!email) { showToast('Ingresa tu correo electrónico'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Ingresa un correo válido'); return; }

  _setLoading(btn, true);
  try {
    await ClaraAPI.auth.forgotPassword(email);
    openModal('modal-recovery');
  } catch (err) {
    showToast(err.message || 'Error al enviar el correo');
  } finally {
    _setLoading(btn, false);
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function logout() {
  try {
    await ClaraAPI.auth.logout();
  } catch (_) {
    // si falla el logout en backend, limpiamos igual
  }

  document.getElementById('app').classList.add('hidden');
  showScreen('screen-login');
  disconnectSocket();

  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value  = '';
}

// ── Verificar sesión activa al cargar la página ───────────────────────────────

async function checkSession() {
  // Ocultar todo mientras se verifica
  document.querySelectorAll('.auth-wrap').forEach(el => el.style.visibility = 'hidden');
  document.getElementById('app').style.visibility = 'hidden';

  if (!Session.isLoggedIn()) {
    // No hay sesión — mostrar login
    document.querySelectorAll('.auth-wrap').forEach(el => el.style.visibility = '');
    document.getElementById('app').style.visibility = '';
    return;
  }

  try {
    const json = await ClaraAPI.auth.getMe();
    if (json?.data) {
      _showApp(json.data);
      cargarPerfil();
    }
  } catch (_) {
    Session.clearSession();
    showScreen('screen-login');
  } finally {
    // Mostrar todo al terminar
    document.querySelectorAll('.auth-wrap').forEach(el => el.style.visibility = '');
    document.getElementById('app').style.visibility = '';
  }
}

// ── Modales ───────────────────────────────────────────────────────────────────

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// ── Carga datos del perfil ──
function cargarPerfil() {
  const user = Session.getUser();
  if (!user) return;

  const nombre = `${user.nombre || ''} ${user.apellido || ''}`.trim();

  const elNombre      = document.getElementById('config-nombre');
  const elEmail       = document.getElementById('config-email');
  const elEspecialidad = document.getElementById('config-especialidad');
  const elTelefono    = document.getElementById('config-telefono');

  if (elNombre)       elNombre.value       = nombre;
  if (elEmail)        elEmail.value        = user.email || '';
  if (elEspecialidad) elEspecialidad.value = user.especialidad || '';
  if (elTelefono)     elTelefono.value     = user.telefono || '';
}

async function guardarPerfil() {
  const nombreCompleto = document.getElementById('config-nombre')?.value.trim() || '';
  const especialidad   = document.getElementById('config-especialidad')?.value || '';
  const telefono       = document.getElementById('config-telefono')?.value.trim() || '';

  const partes   = nombreCompleto.split(' ');
  const nombre   = partes[0] || '';
  const apellido = partes.slice(1).join(' ') || '';

  try {
    const json = await ClaraAPI.auth.updateMe({ nombre, apellido, especialidad, telefono });
    if (json?.data) {
      Session.setSession(Session.getToken(), Session.getRefresh(), json.data);
    }
    showToast('Perfil guardado correctamente');
  } catch (e) {
    showToast('Error al guardar el perfil');
  }
}

async function actualizarPassword() {
  const actual    = document.getElementById('config-pass-actual')?.value;
  const nueva     = document.getElementById('config-pass-nueva')?.value;
  const confirmar = document.getElementById('config-pass-confirmar')?.value;

  if (!actual)          { showToast('Ingresa tu contraseña actual');           return; }
  if (!nueva)           { showToast('Ingresa la nueva contraseña');            return; }
  if (nueva.length < 8) { showToast('Mínimo 8 caracteres');                   return; }
  if (nueva !== confirmar) { showToast('Las contraseñas no coinciden');        return; }

  try {
    await ClaraAPI.auth.changePassword(actual, nueva);
    showToast('Contraseña actualizada correctamente');
    document.getElementById('config-pass-actual').value    = '';
    document.getElementById('config-pass-nueva').value     = '';
    document.getElementById('config-pass-confirmar').value = '';
  } catch (e) {
    showToast(e.message || 'Error al actualizar la contraseña');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', checkSession);
