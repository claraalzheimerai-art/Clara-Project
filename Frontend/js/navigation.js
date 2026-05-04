/* ══════════════════════════════════════
   CLARA – Navigation Module
   Patrón: Singleton – instancia única
   del menú lateral que persiste durante
   toda la sesión
   ══════════════════════════════════════ */

const NavegacionMenu = (function () {
  let _activePageId = 'page-dashboard';
  let _initialized  = false;

  function _init() {
    if (_initialized) return;
    _initialized = true;
    console.log('[NavegacionMenu] Singleton inicializado');
  }

  /**
   * Navega a la página indicada, actualizando el nav y el contenido.
   * @param {HTMLElement|null} btn     - Botón del nav que fue clickeado
   * @param {string}           pageId  - ID del div de página destino
   */
  function goTo(btn, pageId) {
    /* Actualizar nav items */
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (btn && btn.classList) btn.classList.add('active');

    /* Actualizar páginas visibles */
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    _activePageId = pageId;
  }

  function getActivePage() {
    return _activePageId;
  }

  return { init: _init, goTo, getActivePage };
})();

/* Función global usada en los onclick del HTML */
function navigate(btn, pageId) {
  NavegacionMenu.init();
  NavegacionMenu.goTo(btn, pageId);
}

/* Inicializar al cargar la página */
document.addEventListener('DOMContentLoaded', () => {
  NavegacionMenu.init();
});
