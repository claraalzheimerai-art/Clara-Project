import torch
import numpy as np 
from pathlib import Path 
from core.model import AlzheimerUNet 
from data.dicom_loader import load_dicom_volume, load_single_dicom
from data.transfoms   import get_transforms 
from config.config     import cfg

class Predictor:
    """
    Motor de inferencia.
    Carga el modelo entrenado y procesa una imagen DICOM nueva,
    devolviendo label, confianza, máscara de segmentación y zonas.
    """

    def __init__(self, checkpoint: str = "best"):
        self.device = torch.device("cpu")
        self.model  = AlzheimerUNet().to(self.device)
        self.transform = get_transforms("val")
        self._load(checkpoint)
        self.model.eval()

    def _load(self, name: str):
        path = cfg.training.checkpoint_dir / f"{name}.pt"
        if not path.exists():
            raise FileNotFoundError(
                f"No se encontró checkpoint '{name}.pt'.\n"
                f"Entrena el modelo primero con: python train.py"
            )
        ckpt = torch.load(path, map_location=self.device)
        self.model.load_state_dict(ckpt["model_state"])
        print(f"Modelo cargado desde {path}")

    def predict(self, dicom_path: str) -> dict:
        """
        Recibe ruta a carpeta DICOM (serie completa) o archivo .dcm único.
        Devuelve diccionario con resultado completo para enviar a Node.js.
        """
        path = Path(dicom_path)

        # Carga volumen
        if path.is_dir():
            volume = load_dicom_volume(path)
        else:
            volume = load_single_dicom(path)

        # Aplica transforms y agrega dimensión batch
        sample = self.transform({"image": volume, "mask": torch.zeros_like(volume)})
        img    = sample["image"].unsqueeze(0).to(self.device)  # [1,1,D,H,W]

        with torch.no_grad():
            seg_logits, cls_logits = self.model(img)

        # ── Clasificación ─────────────────────────────────────────────
        probs      = torch.softmax(cls_logits, dim=1)[0]
        label_idx  = int(probs.argmax())
        confidence = float(probs[label_idx])
        label_name = cfg.labels[label_idx]

        # ── Segmentación ──────────────────────────────────────────────
        seg_mask = torch.argmax(seg_logits, dim=1)[0]          # [D,H,W]
        seg_np   = seg_mask.cpu().numpy().astype(np.uint8)

        # Detecta zonas afectadas
        zones = self._detect_zones(seg_np, label_idx)

        return {
            "label":      label_name,
            "label_idx":  label_idx,
            "confidence": round(confidence, 4),
            "zones":      zones,
            "mask":       seg_np,             # numpy array → overlay.py lo usa
        }

    def _detect_zones(self, mask: np.ndarray, label_idx: int) -> list[dict]:
        """
        Identifica regiones cerebrales afectadas basándose en la máscara.
        Retorna lista con nombre de zona, volumen afectado y severidad.
        """
        if label_idx == 0:
            return []

        d, h, w   = mask.shape
        total_vox = d * h * w
        zones     = []

        region_map = {
            "hipocampo":      (slice(int(d*.35), int(d*.65)),
                               slice(int(h*.45), int(h*.70)),
                               slice(int(w*.40), int(w*.60))),
            "corteza_parietal": (slice(int(d*.10), int(d*.40)),
                                 slice(int(h*.10), int(h*.45)),
                                 slice(int(w*.20), int(w*.80))),
            "lobulo_temporal":  (slice(int(d*.40), int(d*.80)),
                                 slice(int(h*.50), int(h*.90)),
                                 slice(int(w*.10), int(w*.45))),
        }

        for zone_name, (ds, hs, ws) in region_map.items():
            region  = mask[ds, hs, ws]
            affected = int((region > 0).sum())
            pct      = round(affected / (region.size + 1e-8) * 100, 2)

            if pct > 5.0:   # solo reporta si hay afectación significativa
                zones.append({
                    "zone":     zone_name,
                    "affected": f"{pct}%",
                    "severity": _severity(label_idx),
                })

        return zones


def _severity(label_idx: int) -> str:
    return ["ninguna", "leve", "moderada", "severa"][label_idx]