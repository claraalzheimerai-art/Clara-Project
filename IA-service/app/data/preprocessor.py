import os
import numpy as np
import cv2
from pathlib import Path
from app.data.dataset_loader import scan_dataset, load_nifti_slice
from app.core.config import settings
from app.core.logger import logger


def preprocess_dataset(raw_dir: str, output_dir: str) -> dict:
    """
    Procesa todas las imágenes NIfTI del dataset:
    1. Carga el slice central
    2. Redimensiona a IMAGE_SIZE x IMAGE_SIZE
    3. Convierte a RGB
    4. Guarda como PNG en output_dir/CN|MCI|AD/

    Retorna resumen: {label: count}
    """
    samples = scan_dataset(raw_dir)
    if not samples:
        raise ValueError(f"No se encontraron imágenes en {raw_dir}")

    summary = {"CN": 0, "MCI": 0, "AD": 0, "errores": 0}
    size = settings.IMAGE_SIZE

    for sample in samples:
        label = sample["label"]
        out_class_dir = Path(output_dir) / label
        out_class_dir.mkdir(parents=True, exist_ok=True)

        # Nombre del archivo de salida
        stem = Path(sample["path"]).name.replace(".nii.gz", "").replace(".nii", "")
        out_path = out_class_dir / f"{stem}.png"

        # Saltar si ya existe
        if out_path.exists():
            summary[label] += 1
            continue

        # Cargar slice
        slice_2d = load_nifti_slice(sample["path"])
        if slice_2d is None:
            summary["errores"] += 1
            continue

        # Redimensionar
        resized = cv2.resize(slice_2d, (size, size), interpolation=cv2.INTER_LINEAR)

        # Convertir a RGB (3 canales para ResNet)
        rgb = cv2.cvtColor(resized, cv2.COLOR_GRAY2BGR)

        # Guardar
        cv2.imwrite(str(out_path), rgb)
        summary[label] += 1

    logger.info(f"Preprocesamiento completo: {summary}")
    return summary