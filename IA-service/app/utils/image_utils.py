import base64
import os
import shutil
import tempfile
import zipfile

import cv2
import nibabel as nib
import numpy as np
import pydicom
from PIL import Image
import torch
from torchvision import transforms

from app.core.config import settings
from app.core.logger import logger

ALLOWED_EXTENSIONS = {".nii", ".nii.gz", ".dcm", ".img", ".zip"}

_TRANSFORM = transforms.Compose([
    transforms.Resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def get_ext(filename: str) -> str:
    if filename.endswith(".nii.gz"):
        return ".nii.gz"
    return os.path.splitext(filename)[1].lower()


def load_mri_image(file_path: str) -> tuple[np.ndarray, str | None]:
    """
    Carga imagen MRI. Retorna (array 2D, temp_dir_a_limpiar).
    temp_dir es None salvo para ZIP, donde se extrae a un directorio temporal.
    """
    try:
        if file_path.endswith((".nii", ".nii.gz", ".img")):
            return _load_nifti(file_path), None

        if file_path.endswith(".dcm"):
            ds = pydicom.dcmread(file_path)
            return ds.pixel_array.astype(np.float32), None

        if file_path.endswith(".zip"):
            return _load_zip_series(file_path)

        raise ValueError(f"Formato no soportado: {file_path}")

    except Exception as e:
        logger.error(f"Error cargando imagen MRI: {e}")
        raise


def _load_nifti(file_path: str) -> np.ndarray:
    img = nib.load(file_path)
    data = img.get_fdata()
    if data.ndim == 4:
        data = data[:, :, :, 0]
    if data.ndim != 3:
        raise ValueError(f"Forma inesperada {data.shape} en {file_path}")
    return data[:, :, data.shape[2] // 2]


def _load_zip_series(zip_path: str) -> tuple[np.ndarray, str]:
    """
    Descomprime un ZIP con archivos DICOM (.dcm) o NIfTI (.nii/.nii.gz/.img),
    carga el volumen completo y extrae el slice central axial.
    Retorna (slice_2d, temp_dir) — el llamador debe eliminar temp_dir.
    """
    temp_dir = tempfile.mkdtemp(prefix="clara_zip_")

    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(temp_dir)

    # Buscar archivos médicos en el directorio extraído
    dcm_files = sorted([
        os.path.join(root, f)
        for root, _, files in os.walk(temp_dir)
        for f in files
        if f.lower().endswith(".dcm")
    ])
    nii_files = [
        os.path.join(root, f)
        for root, _, files in os.walk(temp_dir)
        for f in files
        if f.lower().endswith((".nii", ".nii.gz", ".img"))
    ]

    if dcm_files:
        logger.info(f"ZIP: {len(dcm_files)} archivos DICOM encontrados")

        # Cargar todos los slices legibles
        slices = []
        for path in dcm_files:
            try:
                ds = pydicom.dcmread(path)
                slices.append((ds.pixel_array.astype(np.float32), path))
            except Exception:
                continue

        if not slices:
            raise ValueError("No se pudo leer ningún archivo DICOM del ZIP.")

        # Quedarse solo con la forma más frecuente (descarta scouts/localizadores)
        from collections import Counter
        shape_counts = Counter(arr.shape for arr, _ in slices)
        dominant_shape = shape_counts.most_common(1)[0][0]
        filtered = [arr for arr, _ in slices if arr.shape == dominant_shape]

        logger.info(
            f"ZIP: usando {len(filtered)}/{len(slices)} slices "
            f"con shape {dominant_shape} (descartados: {len(slices) - len(filtered)})"
        )

        volume = np.stack(filtered, axis=0)        # (D, H, W)
        return volume[len(volume) // 2], temp_dir

    if nii_files:
        logger.info(f"ZIP: NIfTI encontrado → {nii_files[0]}")
        return _load_nifti(nii_files[0]), temp_dir

    raise ValueError("El ZIP no contiene archivos DICOM (.dcm) ni NIfTI (.nii/.nii.gz/.img).")


def preprocess_image(image: np.ndarray) -> torch.Tensor:
    image = (image - image.min()) / (image.max() - image.min() + 1e-8)
    image_uint8 = (image * 255).astype(np.uint8)
    image_rgb = cv2.cvtColor(image_uint8, cv2.COLOR_GRAY2RGB)
    return _TRANSFORM(Image.fromarray(image_rgb)).unsqueeze(0)


def tensor_to_base64(image: np.ndarray) -> str:
    _, buffer = cv2.imencode(".png", image)
    return f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"
