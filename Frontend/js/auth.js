/* ══════════════════════════════════════
   CLARA – Auth Module (MVC Controller)
   Patrón: MVC – maneja eventos de auth
   y decide qué vista mostrar
   ══════════════════════════════════════ */

/**
 * Muestra una pantalla de autenticación y oculta las demás.
 * @param {string} id - ID del elemento a mostrar
 */
function showScreen(id) {
  const screens = document.querySelectorAll('.auth-wrap');
  screens.forEach(el => el.classList.add('hidden'));

  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
}

/**
 * Simula el login exitoso y muestra la app.
 * En producción: llamar a POST /api/auth/login con fetch()
 */
function loginSuccess() {
  const email = document.getElementById('login-email')?.value;
  const pass  = document.getElementById('login-pass')?.value;

  /* Validación básica (reemplazar con llamada real a FastAPI) */
  if (!email || !pass) {
    showToast('Completa todos los campos');
    return;
  }

  /* Ocultar pantallas de auth y mostrar app */
  document.querySelectorAll('.auth-wrap').forEach(el => el.classList.add('hidden'));
  const app = document.getElementById('app');
  app.classList.remove('hidden');

  /* Iniciar Socket.IO */
  initSocket();

  /* Navegar a dashboard */
  navigate(document.querySelector('[data-page="page-dashboard"]'), 'page-dashboard');
}

/**
 * Simula registro y muestra modal de confirmación.
 * En producción: llamar a POST /api/auth/register
 */
function registerSuccess() {
  openModal('modal-register');
}

/**
 * Simula envío de correo de recuperación.
 * En producción: llamar a POST /api/auth/recovery
 */
function recoverySuccess() {
  openModal('modal-recovery');
}

/**
 * Cierra la sesión y vuelve al login.
 */
function logout() {
  document.getElementById('app').classList.add('hidden');
  showScreen('screen-login');
  disconnectSocket();

  /* Limpiar campos de login */
  const emailInput = document.getElementById('login-email');
  const passInput  = document.getElementById('login-pass');
  if (emailInput) emailInput.value = '';
  if (passInput)  passInput.value  = '';
}

/* ── Helpers de modales ── */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}
