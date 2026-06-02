# CLARA AI Service
**Clinical Learning Assistant for Radiology Analysis**  
Microservicio de Inteligencia Artificial para Clasificación de Alzheimer — (Python + PyTorch + FastAPI)

> Universidad Santiago de Cali · Facultad de Ingeniería · Semestre 2026A  
> Supervisor: Jair Enrique Sanclemente Castro  
> Equipo: Nahia Montoya · Miguel Arcila · Óscar Barón

---

## Arquitectura del Sistema
```
┌─────────────────┐     HTTP/REST      ┌──────────────────────┐
│  clara-frontend │ ◄────────────────► │   clara-backend      │
│  HTML/CSS/JS    │                    │   Node.js/TypeScript  │
└─────────────────┘                    └──────────┬───────────┘
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
| Lenguaje | Python 3.11 |
| Framework | FastAPI |
| Deep Learning | PyTorch + TorchVision |
| Explicabilidad | TorchCAM (Grad-CAM) |
| Imágenes médicas | NiBabel (NIfTI) + OpenCV (DICOM) |
| Servidor ASGI | Uvicorn |
| Logging | Python logging |
| Testing | Pytest |

## Modelo de Clasificación

El modelo clasifica imágenes MRI cerebrales en tres categorías clínicas:

| Clase | Descripción |
|---|---|
| `CN` | Cognitivamente Normal |
| `MCI` | Deterioro Cognitivo Leve |
| `AD` | Enfermedad de Alzheimer |

Arquitectura base: **ResNet50** con fine-tuning sobre la capa `fc` para 3 clases.  
Explicabilidad visual: **Grad-CAM** sobre `layer4` para resaltar regiones de activación.

## Estructura del Proyecto
```
clara-ai-service/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── health.py        # Estado del servicio
│   │   │   └── predict.py       # Endpoint de clasificación
│   │   └── router.py            # Registro de rutas
│   ├── core/
│   │   ├── config.py            # Variables de entorno
│   │   └── logger.py            # Configuración de logs
│   ├── models/
│   │   └── weights/             # Pesos entrenados (.pth) — no se suben a Git
│   ├── services/
│   │   ├── model_service.py     # Carga y predicción del modelo
│   │   └── gradcam_service.py   # Generación de mapas Grad-CAM
│   ├── utils/
│   │   └── image_utils.py       # Carga y preprocesamiento de imágenes
│   └── main.py                  # Configuración FastAPI
├── tests/                       # Pruebas unitarias e integración
├── uploads/temp/                # Archivos temporales (auto-eliminados)
├── .env.example                 # Plantilla de variables de entorno
├── requirements.txt             # Dependencias Python
└── run.py                       # Punto de entrada
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servicio y versión del modelo |
| `POST` | `/predict/` | Clasificar imagen MRI (NIfTI o DICOM) |

### Ejemplo de respuesta `/predict/`
```json
{
  "filename": "scan_001.nii",
  "prediction": {
    "label": "MCI",
    "confidence": 0.7842,
    "probabilities": {
      "CN": 0.1023,
      "MCI": 0.7842,
      "AD": 0.1135
    }
  },
  "gradcam": "data:image/png;base64,...",
  "model_version": "1.0.0"
}
```

## Instalación
```bash
# 1. Clonar el repositorio
git clone https://github.com/claraalzheimerai-art/clara-ai-service.git
cd clara-ai-service

# 2. Crear y activar entorno virtual
python -m venv venv
.\venv\Scripts\activate        # Windows
source venv/bin/activate       # Linux / macOS

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno
cp .env.example .env

# 5. Iniciar el servicio
python run.py
```

El servicio quedará disponible en `http://localhost:8000`.  
Documentación interactiva en `http://localhost:8000/docs`.

## Variables de Entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `HOST` | `0.0.0.0` | Host del servidor |
| `PORT` | `8000` | Puerto del servidor |
| `ENV` | `development` | Entorno de ejecución |
| `MODEL_NAME` | `resnet50` | Arquitectura del modelo |
| `MODEL_PATH` | `app/models/weights/clara_model.pth` | Ruta a los pesos entrenados |
| `MODEL_VERSION` | `1.0.0` | Versión del modelo |
| `IMAGE_SIZE` | `224` | Tamaño de entrada de la imagen (px) |
| `DEVICE` | `cpu` | Dispositivo de inferencia (`cpu` / `cuda`) |

## Scripts

| Comando | Descripción |
|---|---|
| `python run.py` | Iniciar servidor con hot-reload |
| `pytest tests/` | Ejecutar pruebas |
| `pip freeze > requirements.txt` | Actualizar dependencias |

## Ramas de Trabajo

| Rama | Integrante |
|---|---|
| `nahia-branch` | Nahia Montoya |
| `oscar-branch` | Óscar Barón |
| `miguel-branch` | Miguel Arcila |

> Los cambios se integran a `main` únicamente mediante Pull Request con aprobación.

## Formatos de Imagen Soportados

| Formato | Extensión | Descripción |
|---|---|---|
| NIfTI | `.nii`, `.nii.gz` | Formato estándar MRI (volumen 3D) |
| DICOM | `.dcm` | Formato clínico de radiología |

## Privacidad y Cumplimiento Legal

Este servicio procesa imágenes médicas con fines académicos y de investigación.  
- Las imágenes se eliminan automáticamente tras cada análisis.  
- No se almacena ningún dato de pacientes en el servidor.  
- El uso del sistema está restringido al entorno académico de la Universidad Santiago de Cali.

## Entrenamiento del Modelo (OASIS-1)

### Paso 1 — Extraer los discos descargados

```bash
cd D:\OASIS
tar -xzf oasis_cross-sectional_disc5.tar.gz
tar -xzf oasis_cross-sectional_disc6.tar.gz
tar -xzf oasis_cross-sectional_disc9.tar.gz
tar -xzf oasis_cross-sectional_disc10.tar.gz
tar -xzf oasis_cross-sectional_disc11.tar.gz
tar -xzf oasis_cross-sectional_disc12.tar.gz
```

> Los discos 7 y 8 deben descargarse por separado desde [oasis-brains.org](https://www.oasis-brains.org).

### Paso 2 — Organizar datos por clase (CN / MCI / AD)

Desde `C:\Proyectos\clara-ai-service` con el venv activo:

```powershell
python -m app.data.oasis_organizer `
  --xlsx_path "D:\OASIS\oasis_cross-sectional-5708aa0a98d82080.xlsx" `
  --disc_dirs `
    "D:\OASIS\oasis_cross-sectional_disc1.tar\oasis_cross-sectional_disc1\disc1" `
    "D:\OASIS\oasis_cross-sectional_disc2.tar\oasis_cross-sectional_disc2\disc2" `
    "D:\OASIS\oasis_cross-sectional_disc3.tar\oasis_cross-sectional_disc3\disc3" `
    "D:\OASIS\oasis_cross-sectional_disc4.tar\oasis_cross-sectional_disc4\disc4" `
  --output_dir app/data/raw
```

> Agrega los discos restantes a `--disc_dirs` una vez extraídos.

### Paso 3 — Preprocesar imágenes (Analyze → PNG 224×224)

```powershell
python -m app.data.run_pipeline `
  --raw_dir app/data/raw `
  --processed_dir app/data/processed `
  --splits_dir app/data/splits
```

### Paso 4 — Entrenar el ResNet50

```bash
python train_resnet.py
```

El modelo entrenado se guarda en `app/models/weights/clara_model.pth`.  
Para reentrenar con nuevos datos (fine-tuning incremental):

```bash
python train_resnet.py --resume
```