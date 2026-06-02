import uuid
import numpy as np
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles

from inference.predictor import Predictor
from inference.overlay   import generate_overlay
from api.schemas         import PredictionResponse, HealthResponse
from config.config       import cfg

app = FastAPI(title="Alzheimer AI Service", version="1.0.0")

# Carpeta pública para servir imágenes al frontend React
STATIC_DIR = Path("static/results")
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Predictor singleton — carga modelo una sola vez al iniciar
try:
    predictor = Predictor(checkpoint="best")
    MODEL_LOADED = True
except FileNotFoundError:
    predictor    = None
    MODEL_LOADED = False


@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status":          "ok" if MODEL_LOADED else "sin_modelo",
        "model_loaded":    MODEL_LOADED,
        "checkpoint_name": "best",
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    """
    Recibe archivo .dcm desde Node.js.
    Retorna label, confianza, zonas y URLs de overlay para React.
    """
    if not MODEL_LOADED:
        raise HTTPException(
            status_code=503,
            detail="Modelo no disponible. Ejecuta train.py primero.",
        )

    # Guarda .dcm temporalmente
    tmp_id   = uuid.uuid4().hex
    tmp_path = Path(f"tmp_{tmp_id}.dcm")

    try:
        content = await file.read()
        tmp_path.write_bytes(content)

        # Inferencia
        result = predictor.predict(str(tmp_path))

        # Genera overlay PNG (slice central del volumen)
        mask  = result["mask"]
        mid   = mask.shape[0] // 2          # slice central
        out_name = f"{tmp_id}_overlay.png"
        out_path = STATIC_DIR / out_name

        generate_overlay(
            original_slice = np.zeros(mask.shape[1:], dtype=np.float32),
            mask_slice     = mask[mid],
            label          = result["label"],
            confidence     = result["confidence"],
            output_path    = out_path,
        )

        overlay_url = f"/static/results/{out_name}"

        return {
            "label":       result["label"],
            "label_idx":   result["label_idx"],
            "confidence":  result["confidence"],
            "zones":       result["zones"],
            "mask_url":    overlay_url,
            "overlay_url": overlay_url,
        }

    finally:
        if tmp_path.exists():
            tmp_path.unlink()   # limpia archivo temporal


@app.post("/feedback")
async def feedback(patient_id: str, corrected_label: int):
    """
    Recibe correcciones de médicos para fine-tuning incremental.
    Node.js llama este endpoint cuando un médico corrige un diagnóstico.
    """
    # Aquí guardarías la corrección en DB para acumular
    # y luego lanzar fine-tuning cuando haya N muestras nuevas
    return {
        "status":  "feedback_recibido",
        "patient": patient_id,
        "label":   cfg.labels[corrected_label],
    }