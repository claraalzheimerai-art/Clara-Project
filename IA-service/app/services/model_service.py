import torch
import torch.nn as nn
from torchvision import models
from app.core.config import settings
from app.core.logger import logger

# Clases de clasificación
CLASSES = ['CN', 'MCI', 'AD']

class ClaraModel:
    """
    Modelo CNN basado en ResNet50 con fine-tuning
    para clasificación de imágenes MRI de Alzheimer.
    """

    def __init__(self):
        self.device = torch.device(settings.DEVICE)
        self.model = self._load_model()
        self.model.eval()
        logger.info(f"Modelo cargado — dispositivo: {self.device}")

    def _load_model(self) -> nn.Module:
        """Carga ResNet50 con fine-tuning para 3 clases (CN, MCI, AD)."""
        model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)

        # Reemplazar la capa final para 3 clases
        num_features = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(num_features, 3)
        )

        # Cargar pesos entrenados si existen
        import os
        if os.path.exists(settings.MODEL_PATH):
            model.load_state_dict(
                torch.load(settings.MODEL_PATH, map_location=self.device)
            )
            logger.info(f"Pesos cargados desde: {settings.MODEL_PATH}")
        else:
            logger.warning("No se encontraron pesos entrenados — usando pesos base ImageNet")

        return model.to(self.device)

    def predict(self, tensor: torch.Tensor) -> dict:
        """Realiza la inferencia y retorna clasificación con probabilidades."""
        tensor = tensor.to(self.device)

        with torch.no_grad():
            outputs = self.model(tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]

        probs = {CLASSES[i]: round(probabilities[i].item(), 4) for i in range(3)}
        label = max(probs, key=probs.get)
        confidence = probs[label]

        logger.info(f"Predicción: {label} ({confidence * 100:.1f}%)")

        return {
            "label": label,
            "confidence": confidence,
            "probabilities": probs
        }

# Instancia global del modelo (se carga una sola vez al iniciar)
clara_model = ClaraModel()