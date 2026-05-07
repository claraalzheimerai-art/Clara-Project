from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

@dataclass
class ModelConfig:
    spatial_dims: int = 3
    in_channels: int = 1
    out_channels: int = 4          # normal · MCI · Alz. temprano · avanzado
    channels: tuple = (16, 32, 64, 128, 256)
    strides: tuple = (2, 2, 2, 2)
    dropout: float = 0.1

@dataclass
class TrainingConfig:
    epochs: int = 50
    batch_size: int = 2            # CPU: batch pequeño
    learning_rate: float = 1e-4
    fine_tune_lr: float = 1e-5     # para autoaprendizaje incremental
    val_split: float = 0.2
    patience: int = 10             # early stopping
    checkpoint_dir: Path = BASE_DIR / "checkpoints"
    log_dir: Path = BASE_DIR / "logs"

@dataclass
class DataConfig:
    dataset_dir: Path = BASE_DIR / "datasets"
    image_size: tuple = (96, 96, 96)   # CPU: reducido de 128 para que quepa
    cache_rate: float = 0.5

@dataclass
class AppConfig:
    model: ModelConfig = field(default_factory=ModelConfig)
    training: TrainingConfig = field(default_factory=TrainingConfig)
    data: DataConfig = field(default_factory=DataConfig)
    labels: tuple = ("Normal", "MCI", "Alzheimer temprano", "Alzheimer avanzado")

# Instancia global — importar desde cualquier módulo
cfg = AppConfig()