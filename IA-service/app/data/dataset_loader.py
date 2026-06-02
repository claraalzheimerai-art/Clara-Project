import logging
import os
import numpy as np
import nibabel as nib
import cv2
from pathlib import Path
from app.core.logger import logger

logging.getLogger("nibabel.global").setLevel(logging.ERROR)
LABEL_MAP = {"CN": 0, "MCI": 1, "AD": 2}


def load_nifti_slice(file_path: str) -> np.ndarray | None:
    """
    Carga un archivo NIfTI y extrae el slice central del eje axial.
    Retorna array 2D normalizado [0, 255] uint8, o None si falla.
    """
    try:
        img = nib.load(file_path)
        data = img.get_fdata()

        # Asegurar volumen 3D
        if data.ndim == 4:
            data = data[:, :, :, 0]
        if data.ndim != 3:
            logger.warning(f"Forma inesperada {data.shape} en {file_path}")
            return None

        # Slice central axial
        z = data.shape[2] // 2
        slice_2d = data[:, :, z]

        # Normalizar a uint8
        s_min, s_max = slice_2d.min(), slice_2d.max()
        if s_max - s_min < 1e-8:
            return None

        normalized = ((slice_2d - s_min) / (s_max - s_min) * 255).astype(np.uint8)
        return normalized

    except Exception as e:
        logger.error(f"Error cargando {file_path}: {e}")
        return None


def scan_dataset(raw_dir: str) -> list[dict]:
    """
    Escanea la carpeta raw esperando esta estructura:
    raw/
      CN/   *.nii o *.nii.gz
      MCI/  *.nii o *.nii.gz
      AD/   *.nii o *.nii.gz

    Retorna lista de dicts: [{path, label, label_idx}]
    """
    samples = []
    raw_path = Path(raw_dir)

    for label_name, label_idx in LABEL_MAP.items():
        class_dir = raw_path / label_name
        if not class_dir.exists():
            logger.warning(f"Carpeta no encontrada: {class_dir}")
            continue

        files = (list(class_dir.glob("*.nii")) + 
         list(class_dir.glob("*.nii.gz")) + 
         list(class_dir.glob("*.img")))
        
        logger.info(f"Clase {label_name}: {len(files)} archivos encontrados")

        for f in files:
            samples.append({
                "path": str(f),
                "label": label_name,
                "label_idx": label_idx
            })
            
    logger.info(f"Total muestras escaneadas: {len(samples)}")
    return samples