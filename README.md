# CLARA Backend API
![Tests](https://img.shields.io/badge/tests-59%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![Node](https://img.shields.io/badge/node-20%20LTS-green)
![TypeScript](https://img.shields.io/badge/typescript-6.0-blue)
![License](https://img.shields.io/badge/license-academic-orange)

**Clinical Learning Assistant for Radiology Analysis**  
Sistema de Diagnóstico Temprano de Alzheimer — Backend (Node.js + TypeScript)

> Universidad Santiago de Cali · Facultad de Ingeniería · Semestre 2026A  
> Supervisor: Jair Enrique Sanclemente Castro  
> Equipo: Nahia Montoya · Miguel Arcila · Óscar Barón

---

## Arquitectura del Sistema
```
┌─────────────────┐     HTTP/REST      ┌──────────────────────┐
│  clara-frontend │ ◄────────────────► │   clara-backend      │
│  HTML/CSS/JS    │                    │   Node.js/TypeScript │
└─────────────────┘                    └──────────┬───────────┘
                                                  │ HTTP interno
                                                  ▼
                                       ┌──────────────────────┐
                                       │   clara-ai-service   │
                                       │   Python + PyTorch   │
                                       │   + torchcam         │
                                       └──────────────────────┘
```

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20 LTS |
| Lenguaje | TypeScript |
| Framework | Express |
| Comunicación IA | Axios → clara-ai-service (Python/FastAPI) |
| Subida de archivos | Multer |
| Tiempo real | Socket.IO |
| Logging | Winston |
| Testing | Jest + Supertest |

## Estructura del Proyecto
```
clara-backend/
├── src/
│   ├── config/            # Variables de entorno y configuración Multer
│   ├── controllers/       # Lógica de endpoints
│   ├── middlewares/       # CORS, errores, validación
│   ├── models/            # Definición de modelos de datos y esquemas de la base de datos
│   ├── routes/            # Definición de rutas
│   ├── scripts/           # Scripts auxiliares (migraciones, seeds, automatizaciones, etc)
│   ├── services/          # Cliente HTTP al microservicio IA
│   ├── test/
│       ├── unit/          # Pruebas unitarias
│       └── integration/   # Pruebas de integración
│   ├── types/             # Tipos TypeScript compartidos
│   ├── utils/             # Logger y manejo de archivos
│   ├── app.ts             # Configuración Express
│   ├── server.ts          # Punto de entrada
│   └── socket.ts          # Configuración Socket.IO
│
├── uploads/temp/          # Archivos temporales (auto-eliminados)
├── .env.example           # Plantilla de variables de entorno
└── tsconfig.json
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/analysis/health` | Estado del backend y AI Service |
| `POST` | `/api/v1/analysis/upload` | Analizar imagen MRI |

## Instalación
```bash
# 1. Clonar el repositorio
git clone https://github.com/claraalzheimerai-art/clara-backend.git
cd clara-backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Iniciar en modo desarrollo
npm run dev
```

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor con hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm start` | Ejecutar build compilado |
| `npm test` | Ejecutar pruebas |

## Ramas de Trabajo

| Rama | Integrante |
|---|---|
| `nahia-branch` | Nahia Montoya |
| `oscar-branch` | Óscar Barón |

> Los cambios se integran a `main` únicamente mediante Pull Request con aprobación.

## Privacidad y Cumplimiento Legal

- **Ley 1581 de 2012** — Las imágenes MRI se eliminan del servidor inmediatamente tras retornar el resultado.
- **Decreto 1377 de 2013** — No se almacena ningún dato médico de forma permanente.

---

*Proyecto académico — Universidad Santiago de Cali · 2026*
