import numpy as np
import pydicom
import torch
from pathlib import Path

def load_dicom_volume(folder: str | Path) -> torch.Tensor:
    """
    Carga una serie DICOM (carpeta con múltiples slices)
    y devuelve un tensor 3D normalizado [1, D, H, W].
    """
    folder = Path(folder)
    slices = []

    for dcm_file in sorted(folder.glob("*.dcm")):
        ds = pydicom.dcmread(str(dcm_file))
        slices.append(ds.pixel_array.astype(np.float32))

    if not slices:
        raise ValueError(f"No se encontraron archivos .dcm en {folder}")

    volume = np.stack(slices, axis=0)             # (D, H, W)
    volume = _normalize(volume)
    tensor = torch.from_numpy(volume).unsqueeze(0) # (1, D, H, W)
    return tensor


def load_single_dicom(path: str | Path) -> torch.Tensor:
    """Carga un único archivo .dcm y devuelve tensor 2D como volumen [1,1,H,W]."""
    ds = pydicom.dcmread(str(path))
    img = ds.pixel_array.astype(np.float32)
    img = _normalize(img)
    return torch.from_numpy(img).unsqueeze(0).unsqueeze(0)


def _normalize(arr: np.ndarray) -> np.ndarray:
    """Normalización min-max al rango [0, 1]."""
    mn, mx = arr.min(), arr.max()
    if mx - mn < 1e-8:
        return np.zeros_like(arr)
    return (arr - mn) / (mx - mn)