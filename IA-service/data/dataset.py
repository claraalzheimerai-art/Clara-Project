import torch
from torch.utils.data import Dataset
from pathlib import Path
import numpy as np
from data.dicom_loader import load_dicom_volume
from data.transforms import get_transforms
from config.config import cfg

class AlzheimerDataset(Dataset):
    """
    Dataset para imágenes MRI cerebrales en formato DICOM.

    Estructura esperada en disco:
        datasets/
          train/
            normal/       paciente_001/  *.dcm
            mci/          paciente_002/  *.dcm
            early/        paciente_003/  *.dcm
            advanced/     paciente_004/  *.dcm
          new_samples/    (para fine-tuning)

    Cada carpeta de clase contiene subcarpetas por paciente,
    cada subcarpeta tiene los slices .dcm de esa serie MRI.
    """

    LABEL_MAP = {
        "normal":   0,
        "mci":      1,
        "early":    2,
        "advanced": 3,
    }

    def __init__(self, root_dir: Path, split: str = "train", transform=None):
        self.root      = Path(root_dir) / split
        self.transform = transform or get_transforms(split)
        self.samples   = []   # lista de (carpeta_paciente, label_int)
        self._build_index()

    def _build_index(self):
        """Escanea la carpeta y construye el índice de muestras."""
        for label_name, label_idx in self.LABEL_MAP.items():
            class_dir = self.root / label_name
            if not class_dir.exists():
                continue
            for patient_dir in sorted(class_dir.iterdir()):
                if patient_dir.is_dir():
                    dcm_files = list(patient_dir.glob("*.dcm"))
                    if dcm_files:
                        self.samples.append((patient_dir, label_idx))

        if not self.samples:
            raise RuntimeError(
                f"No se encontraron muestras en {self.root}.\n"
                f"Verifica la estructura de carpetas esperada."
            )

        print(f"Dataset cargado: {len(self.samples)} pacientes en {self.root}")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> dict:
        patient_dir, label = self.samples[idx]

        # Carga volumen DICOM → tensor [1, D, H, W]
        volume = load_dicom_volume(patient_dir)

        # Genera máscara sintética si no existe archivo de anotación real
        # (reemplazar por máscara real cuando tengas anotaciones médicas)
        mask = self._load_or_generate_mask(patient_dir, volume.shape, label)

        sample = {
            "image":      volume,
            "mask":       mask,
            "label":      torch.tensor(label, dtype=torch.long),
            "patient_id": patient_dir.name,
        }

        if self.transform:
            sample = self.transform(sample)

        return sample

    def _load_or_generate_mask(
        self,
        patient_dir: Path,
        shape: tuple,
        label: int,
    ) -> torch.Tensor:
        """
        Intenta cargar máscara de segmentación real (.npy).
        Si no existe, genera una máscara sintética para poder
        entrenar el pipeline antes de tener anotaciones.
        """
        mask_path = patient_dir / "mask.npy"

        if mask_path.exists():
            mask = np.load(str(mask_path)).astype(np.int64)
            return torch.from_numpy(mask).unsqueeze(0)

        # Máscara sintética: marca región central como zona afectada
        # según el nivel de severidad del label
        _, d, h, w = shape
        mask = np.zeros((d, h, w), dtype=np.int64)

        if label > 0:
            # Región hipocampal aproximada (centro-inferior del volumen)
            d0, d1 = int(d * 0.35), int(d * 0.65)
            h0, h1 = int(h * 0.45), int(h * 0.70)
            w0, w1 = int(w * 0.40), int(w * 0.60)
            mask[d0:d1, h0:h1, w0:w1] = label   # intensidad según severidad

        return torch.from_numpy(mask).unsqueeze(0)