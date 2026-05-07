import torch
import numpy as np
import cv2
from torchcam.methods import GradCAM
from torchcam.utils import overlay_mask
from torchvision.transforms.functional import to_pil_image
from app.core.logger import logger


class GradCAMService:
    """
    Genera mapas de activación Grad-CAM sobre la imagen MRI
    para explicar visualmente la decisión del modelo.
    """

    def __init__(self, model: torch.nn.Module, target_layer: str = "layer4"):
        self.model = model
        self.target_layer = target_layer

    def generate(self, tensor: torch.Tensor, class_idx: int = None) -> np.ndarray:
        """
        Genera el heatmap Grad-CAM.
        Retorna imagen numpy con el mapa superpuesto (BGR para OpenCV).
        """
        try:
            cam_extractor = GradCAM(self.model, target_layer=self.target_layer)

            # Forward pass con gradientes activos
            self.model.eval()
            output = self.model(tensor)

            if class_idx is None:
                class_idx = output.squeeze().argmax().item()

            # Extraer mapa de activación
            activation_map = cam_extractor(class_idx, output)
            cam_map = activation_map[0].squeeze()

            # Superponer sobre imagen original
            original = tensor.squeeze().permute(1, 2, 0).numpy()
            original = (original - original.min()) / (original.max() - original.min())

            pil_original = to_pil_image(tensor.squeeze())
            overlay = overlay_mask(
                pil_original,
                to_pil_image(cam_map, mode="F"),
                alpha=0.5
            )

            # Convertir a numpy BGR
            result = cv2.cvtColor(np.array(overlay), cv2.COLOR_RGB2BGR)
            logger.info(f"Grad-CAM generado — clase objetivo: {class_idx}")
            return result

        except Exception as e:
            logger.error(f"Error generando Grad-CAM: {e}")
            raise


