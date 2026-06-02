# CLARA — Clinical Learning Assistant for Radiology Analysis

![License](https://img.shields.io/badge/license-academic-orange)
![Universidad](https://img.shields.io/badge/USC-2026A-blue)
![Status](https://img.shields.io/badge/status-en%20desarrollo-yellow)

Sistema de diagnóstico temprano de Alzheimer mediante análisis de imágenes MRI con Deep Learning.

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
## Estructura del Repositorio

| Carpeta | Descripción | Tecnología |
|---|---|---|
| `Backend/` | API REST, autenticación JWT, historial | Node.js + TypeScript |
| `Frontend/` | Interfaz para el médico | HTML/CSS/JS |
| `IA-service/` | Clasificación MRI + Grad-CAM | Python + PyTorch |

## Módulos Implementados

### Backend
- API REST con Express + TypeScript
- Autenticación JWT (registro, login, verificación de email, reset de contraseña)
- Módulo de historial de análisis
- Integración HTTP con IA-service
- Socket.IO para resultados en tiempo real
- Documentación Swagger/OpenAPI
- 83 tests — cobertura 100%

### IA-service
- Clasificación de imágenes MRI (CN / MCI / AD)
- Modelo ResNet50 con fine-tuning
- Mapas de explicabilidad Grad-CAM
- Pipeline de preprocesamiento OASIS-1

### Frontend
- Interfaz de login y registro
- Dashboard con estadísticas
- Módulo de análisis MRI
- Visualización de resultados y Grad-CAM

## Clasificación Clínica

| Clase | Descripción |
|---|---|
| `CN` | Cognitivamente Normal |
| `MCI` | Deterioro Cognitivo Leve |
| `AD` | Enfermedad de Alzheimer |

## Instalación

Cada módulo tiene su propio README con instrucciones detalladas:

- [Backend/README.md](./Backend/README.md)
- [IA-service/README.md](./IA-service/README.md)
- [Frontend/README.md](./Frontend/README.md)

## Ramas de Trabajo

| Rama | Integrante | Módulo |
|---|---|---|
| `Backend` | Nahia Montoya | API REST + Auth + BD |
| `Ai-project` | Óscar Barón | IA + Modelo + Dataset |
| `Frontend` | Miguel Arcila | Interfaz de usuario |

> Los cambios se integran a `main` únicamente mediante Pull Request con aprobación.

## Privacidad y Cumplimiento Legal

- **Ley 1581 de 2012** — Las imágenes MRI se eliminan del servidor tras cada análisis.
- **Decreto 1377 de 2013** — No se almacena ningún dato médico de forma permanente.
- Uso restringido al entorno académico de la Universidad Santiago de Cali.

---

*Proyecto académico — Universidad Santiago de Cali · 2026*
