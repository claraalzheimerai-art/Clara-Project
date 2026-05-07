from fastapi import APIRouter, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
import uuid

from app.services.model_service import clara_model
from app.services.gradcam_service import GradCAMService

gradcam_service = GradCAMService(clara_model.model)
from app.utils.image_utils import (
    ALLOWED_EXTENSIONS,
    get_ext,
    load_mri_image,
    preprocess_image,
    tensor_to_base64,
)
from app.core.config import settings
from app.core.logger import logger

router = APIRouter(prefix="/predict", tags=["Predicción"])

UPLOAD_DIR = "uploads/temp"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _save_temp(file: UploadFile, ext: str) -> str:
    path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
    with open(path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    return path


_OPENAPI_SCHEMA = {
    "requestBody": {
        "required": True,
        "content": {
            "multipart/form-data": {
                "schema": {
                    "type": "object",
                    "required": ["files"],
                    "properties": {
                        "files": {
                            "type": "array",
                            "items": {"type": "string", "format": "binary"},
                            "description": "Una o varias imágenes MRI (.nii, .nii.gz, .dcm, .img) o un ZIP con serie DICOM completa",
                        }
                    },
                }
            }
        },
    }
}


@router.post("/", openapi_extra=_OPENAPI_SCHEMA)
async def predict(files: list[UploadFile]):
    """
    Recibe una o varias imágenes MRI (NIfTI, Analyze o DICOM).
    Evalúa todas, selecciona la de mayor confianza y retorna
    su clasificación + Grad-CAM.
    """
    if not files:
        raise HTTPException(status_code=400, detail="Se requiere al menos una imagen.")

    temp_paths = []
    temp_dirs = []
    all_predictions = []
    best = None

    try:
        for file in files:
            ext = get_ext(file.filename)
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Formato no soportado: '{file.filename}'. Use .nii, .nii.gz, .dcm, .img o .zip",
                )

            temp_path = _save_temp(file, ext)
            temp_paths.append(temp_path)
            logger.info(f"Archivo recibido: {file.filename} → {temp_path}")

            mri_array, temp_dir = load_mri_image(temp_path)
            if temp_dir:
                temp_dirs.append(temp_dir)

            tensor = preprocess_image(mri_array)
            prediction = clara_model.predict(tensor)
            logger.info(f"{file.filename} → {prediction['label']} ({prediction['confidence']:.2%})")

            all_predictions.append({"filename": file.filename, "prediction": prediction})

            if best is None or prediction["confidence"] > best["prediction"]["confidence"]:
                best = {"filename": file.filename, "tensor": tensor, "prediction": prediction}

        heatmap = gradcam_service.generate(best["tensor"])

        return JSONResponse(content={
            "best_filename": best["filename"],
            "prediction": best["prediction"],
            "gradcam": tensor_to_base64(heatmap),
            "all_predictions": all_predictions,
            "model_version": settings.MODEL_VERSION,
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en predicción: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)
        for d in temp_dirs:
            shutil.rmtree(d, ignore_errors=True)
