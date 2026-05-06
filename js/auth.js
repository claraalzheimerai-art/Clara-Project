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
  const email = document.getElementById('login-email');
  const pass  = document.getElementById('login-pass');

  if (!email?.value.trim()) {
    showToast('Ingresa tu correo electrónico'); return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value)) {
      showToast('Ingresa un correo válido'); return;
}
  if (!pass?.value.trim()) {
    showToast('Ingresa tu contraseña'); return;
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
  const nombre    = document.querySelector('#screen-register input[type="text"]');
  const apellido  = document.querySelectorAll('#screen-register input[type="text"]')[1];
  const telefono  = document.querySelectorAll('#screen-register input[type="text"]')[2];
  const correo    = document.querySelector('#screen-register input[type="email"]');
  const password  = document.querySelector('#screen-register input[type="password"]');
  const confirmar = document.querySelectorAll('#screen-register input[type="password"]')[1];
  const especialidad = document.querySelector('#screen-register select');

  if (!nombre?.value.trim()) {
    showToast('El nombre es obligatorio'); return;
  }
  if (!apellido?.value.trim()) {
    showToast('El apellido es obligatorio'); return;
  }
  if (!telefono?.value.trim()) {
    showToast('El teléfono es obligatorio'); return;
  }
  if (!especialidad?.value) {
    showToast('Selecciona una especialidad'); return;
  }
  if (!correo?.value.trim()) {
    showToast('El correo es obligatorio'); return;
  }
  if (!password?.value.trim()) {
    showToast('La contraseña es obligatoria'); return;
  }
  if (password.value.length < 8) {
    showToast('La contraseña debe tener mínimo 8 caracteres'); return;
  }
  if (!confirmar?.value.trim()) {
    showToast('Confirma tu contraseña'); return;
  }
  if (password.value !== confirmar.value) {
    showToast('Las contraseñas no coinciden'); return;
  }
  
  openModal('modal-register');
}

/**
 * Simula envío de correo de recuperación.
 * En producción: llamar a POST /api/auth/recovery
 */
function recoverySuccess() {

  const correo = document.querySelector('#screen-recovery input[type="email"]');

  if (!correo?.value.trim()) {
    showToast('Ingresa tu correo electrónico'); return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo.value)) {
    showToast('Ingresa un correo válido'); return;
  }
  
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
