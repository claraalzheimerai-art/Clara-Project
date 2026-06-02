import numpy as np
import cv2
from pathlib import Path
from config.config import cfg

# Colores BGR por clase (para OpenCV)
MASK_COLORS = {
    0: (0,   0,   0),      # normal      → transparente
    1: (0,   200, 255),    # MCI         → amarillo suave
    2: (0,   120, 255),    # temprano    → naranja
    3: (0,   0,   220),    # avanzado    → rojo
}

def generate_overlay(
    original_slice: np.ndarray,
    mask_slice:     np.ndarray,
    label:          str,
    confidence:     float,
    output_path:    str | Path,
    alpha:          float = 0.45,
) -> str:
    """
    Superpone la máscara de segmentación sobre un slice MRI.
    Agrega label y confianza como texto.
    Guarda el resultado como PNG y retorna la ruta.
    """
    # Normaliza slice original a uint8
    img = _to_uint8(original_slice)
    img_bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    # Construye overlay de colores
    overlay = np.zeros_like(img_bgr)
    for cls_idx, color in MASK_COLORS.items():
        if cls_idx == 0:
            continue
        overlay[mask_slice == cls_idx] = color

    # Mezcla imagen original con overlay
    blended = cv2.addWeighted(img_bgr, 1.0, overlay, alpha, 0)

    # Dibuja contorno de la región afectada
    affected = (mask_slice > 0).astype(np.uint8)
    contours, _ = cv2.findContours(affected, cv2.RETR_EXTERNAL,
                                   cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(blended, contours, -1, (255, 255, 255), 1)

    # Label superior izquierdo
    label_text = f"{label}  {confidence*100:.1f}%"
    cv2.rectangle(blended, (8, 8), (300, 36), (0, 0, 0), -1)
    cv2.putText(
        blended, label_text,
        (12, 28), cv2.FONT_HERSHEY_SIMPLEX,
        0.65, (255, 255, 255), 1, cv2.LINE_AA,
    )

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), blended)

    return str(output_path)


def _to_uint8(arr: np.ndarray) -> np.ndarray:
    """Normaliza a [0,255] uint8."""
    mn, mx = arr.min(), arr.max()
    if mx - mn < 1e-8:
        return np.zeros(arr.shape, dtype=np.uint8)
    return ((arr - mn) / (mx - mn) * 255).astype(np.uint8)