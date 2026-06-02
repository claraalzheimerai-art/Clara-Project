# CLARA Frontend
![HTML5](https://img.shields.io/badge/html5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Socket.IO](https://img.shields.io/badge/socket.io-4.7.5-010101?logo=socketdotio)
![License](https://img.shields.io/badge/license-academic-orange)

**Clinical Learning Assistant for Radiology Analysis**  
Sistema de Diagnóstico Temprano de Alzheimer — Frontend (HTML + CSS + JavaScript)

> Universidad Santiago de Cali · Facultad de Ingeniería · Semestre 2026A  
> Supervisor: Jair Enrique Sanclemente Castro  
> Equipo: Nahia Montoya · Miguel Arcila · Óscar Barón

---

## Arquitectura del Sistema

```
┌─────────────────┐     HTTP/REST + Socket.IO     ┌──────────────────────┐
│  clara-frontend │ ◄──────────────────────────► │   clara-backend      │
│  HTML/CSS/JS    │                               │   Node.js/TypeScript │
└─────────────────┘                               └──────────┬───────────┘
                                                             │ HTTP interno
                                                             ▼
                                                  ┌──────────────────────┐
                                                  │   clara-ai-service   │
                                                  │   Python + PyTorch   │
                                                  │   ResNet50 + GradCAM │
                                                  └──────────────────────┘
```

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Estructura | HTML5 semántico |
| Estilos | CSS3 con variables (design tokens) |
| Lógica | Vanilla JavaScript (ES6+) |
| Tiempo real | Socket.IO 4.7.5 |
| Tipografía | Google Fonts — DM Sans + DM Serif Display |
| Servidor de desarrollo | Live Server (VSCode) / http-server |

## Patrones de Diseño Aplicados

| Patrón | Módulo | Descripción |
|---|---|---|
| **MVC** | `js/auth.js` | Controlador de autenticación: gestiona login, registro, recuperación y navegación entre vistas |
| **Observer** | `js/analisis.js` + Socket.IO | El backend emite eventos de progreso (`analysis:started`, `analysis:progress`, `analysis:complete`) y el frontend reacciona actualizando la UI en tiempo real |
| **Strategy** | `js/analisis.js` | El usuario selecciona el modelo IA (ResNet-50 / VGG16) en tiempo de ejecución sin modificar el flujo principal |
| **Facade** | `js/api.js` | Interfaz unificada (`ClaraAPI`) que oculta la complejidad de comunicación con el backend y Socket.IO |
| **Singleton** | `js/navigation.js` | Instancia única del menú lateral (`NavegacionMenu`) que persiste durante toda la sesión |

## Estructura del Proyecto

```
clara-frontend/
├── index.html              # SPA principal — todas las vistas
├── css/
│   ├── variables.css       # Design tokens (colores, fuentes, radios)
│   ├── auth.css            # Pantallas de login, registro y recuperación
│   ├── layout.css          # Sidebar fijo + main content
│   ├── components.css      # Botones, modales, badges, toast (reutilizables)
│   └── pages.css           # Estilos específicos por sección
└── js/
    ├── api.js              # Cliente HTTP + Socket.IO (Facade)
    ├── auth.js             # Login, registro, recuperación, logout (MVC)
    ├── navigation.js       # Menú lateral persistente (Singleton)
    ├── analisis.js         # Carga de imagen + análisis en tiempo real (Observer + Strategy)
    └── utils.js            # Helpers: showToast(), formatearFecha(), esValido()
```

## Pantallas

| Pantalla | Descripción |
|---|---|
| **Login** | Autenticación con correo y contraseña |
| **Registro** | Creación de cuenta médica con especialidad |
| **Recuperación** | Envío de enlace de restablecimiento por correo |
| **Dashboard** | Acceso rápido a las secciones principales |
| **Análisis imagen** | Carga de archivos `.nii` / `.nii.gz` / `.dcm` con selector de modelo y umbral de confianza |
| **Resultados** | Diagnóstico completo: clasificación, confianza, imagen MRI, mapa Grad-CAM, análisis por regiones cerebrales e info técnica |
| **Configuración** | Edición de perfil y cambio de contraseña |

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/claraalzheimerai-art/clara-frontend.git
cd clara-frontend

# 2. Levantar con Live Server (VSCode)
#    Clic derecho en index.html → Open with Live Server
#    → http://127.0.0.1:5500

# O con http-server (Node.js)
npx http-server . -p 5500 --cors

# O con Python
python -m http.server 5500
```

> **Importante:** el frontend requiere que `clara-backend` esté corriendo en `http://localhost:3000`  
> y `clara-ai-service` en `http://localhost:8000` para funcionar correctamente.

## Variables de Entorno del Backend requeridas

El frontend no tiene variables de entorno propias. Las URLs de conexión se configuran en `js/api.js`:

```javascript
const BACKEND_URL = 'http://localhost:3000';  // clara-backend
```

Asegúrate de que el puerto del servidor de desarrollo esté en `ALLOWED_ORIGINS` del backend:

```env
# clara-backend/.env
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

## Flujo de un Análisis

```
1. Usuario sube archivo .nii, .nii.gz o .dcm
2. Frontend → POST /api/v1/analysis/upload { mriFile: <archivo> }
3. Backend emite via Socket.IO: analysis:started
4. Backend reenvía imagen al AI Service (FastAPI)
5. AI Service: preprocesa → ResNet50 → Grad-CAM
6. Backend emite: analysis:progress (etapas de procesamiento)
7. Backend emite: analysis:complete { prediction, gradcam_base64, model_version }
8. Frontend renderiza: clasificación (CN / MCI / AD), confianza y mapa de calor
```

## Clasificaciones del Diagnóstico

| Etiqueta | Significado | Color |
|---|---|---|
| `CN` | Cognitivamente Normal | Verde |
| `MCI` | Deterioro Cognitivo Leve | Amarillo |
| `AD` | Enfermedad de Alzheimer | Rojo |

## Ramas de Trabajo

| Rama | Integrante |
|---|---|
| `miguel-branch` | Miguel Arcila |

> Los cambios se integran a `main` únicamente mediante Pull Request con aprobación.

## Privacidad y Cumplimiento Legal

- **Ley 1581 de 2012** — Las imágenes MRI se procesan en el backend y se eliminan inmediatamente tras retornar el resultado. El frontend nunca almacena datos médicos.
- **Decreto 1377 de 2013** — No se persiste ningún dato de paciente en el navegador (sin localStorage, sin cookies de sesión médica).

---

*Proyecto académico — Universidad Santiago de Cali · 2026*
