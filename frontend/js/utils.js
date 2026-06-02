/* ══════════════════════════════════════
   CLARA – Utilities
   ══════════════════════════════════════ */

/**
 * Muestra una notificación toast temporal.
 * @param {string} mensaje - Texto a mostrar
 * @param {number} duracion - Duración en ms (default 2500)
 */
function showToast(mensaje, duracion = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = mensaje;
  toast.classList.add('show');

  setTimeout(() => toast.classList.remove('show'), duracion);
}

/**
 * Formatea una fecha al estilo "27 de Abril, 2026".
 * @param {Date} fecha
 * @returns {string}
 */
function formatearFecha(fecha = new Date()) {
  return fecha.toLocaleDateString('es-CO', {
    day:   'numeric',
    month: 'long',
    year:  'numeric'
  });
}

/**
 * Valida que un campo no esté vacío.
 * @param {string} valor
 * @returns {boolean}
 */
function esValido(valor) {
  return valor !== null && valor !== undefined && valor.trim() !== '';
}

function togglePass(inputId, span) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  span.textContent = isPassword ? 'Ocultar' : 'Ver';
  input.focus();
}