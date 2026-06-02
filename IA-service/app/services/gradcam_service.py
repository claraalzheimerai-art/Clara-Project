import torch
import numpy as np
import cv2
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
            self.model.eval()

            target_module = dict(self.model.named_modules()).get(self.target_layer)
            if target_module is None:
                raise ValueError(f"Capa '{self.target_layer}' no encontrada en el modelo.")

            activations: list[torch.Tensor] = []
            gradients: list[torch.Tensor] = []

            h_fwd = target_module.register_forward_hook(
                lambda _m, _i, out: activations.append(out)
            )
            h_bwd = target_module.register_full_backward_hook(
                lambda _m, _gi, go: gradients.append(go[0].detach())
            )

            try:
                # clone() evita que requires_grad_() mute el tensor original
                input_tensor = tensor.float().clone().detach().requires_grad_(True)

                with torch.enable_grad():
                    output = self.model(input_tensor)

                    if class_idx is None:
                        class_idx = output.squeeze().argmax().item()

                    self.model.zero_grad()
                    output[:, class_idx].backward()

            finally:
                h_fwd.remove()
                h_bwd.remove()

            acts = activations[0].detach()
            grads = gradients[0]

            weights = grads.mean(dim=(2, 3), keepdim=True)
            cam = (weights * acts).sum(dim=1).squeeze()
            cam = torch.relu(cam)
            cam = cam - cam.min()
            cam_max = cam.max()
            if cam_max > 0:
                cam = cam / cam_max

            cam_np = cam.numpy()
            h, w = tensor.shape[-2], tensor.shape[-1]
            cam_resized = cv2.resize(cam_np, (w, h))
            heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)

            original = tensor.squeeze().permute(1, 2, 0).numpy()
            original = (original - original.min()) / (original.max() - original.min() + 1e-8)
            original_bgr = cv2.cvtColor(np.uint8(255 * original), cv2.COLOR_RGB2BGR)

            result = cv2.addWeighted(original_bgr, 0.5, heatmap, 0.5, 0)
            logger.info(f"Grad-CAM generado — clase objetivo: {class_idx}")
            return result

        except Exception as e:
            logger.error(f"Error generando Grad-CAM: {e}")
            raise
