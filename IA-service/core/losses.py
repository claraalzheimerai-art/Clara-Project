import torch
import torch.nn as nn
from monai.losses import DiceLoss

class CombinedLoss(nn.Module):
    """
    Pérdida combinada: Dice (segmentación) + CrossEntropy (clasificación).
    Pesos ajustables para balancear ambas tareas.
    """

    def __init__(self, seg_weight: float = 0.7, cls_weight: float = 0.3):
        super().__init__()
        self.seg_weight = seg_weight
        self.cls_weight = cls_weight
        self.dice_loss  = DiceLoss(softmax=True, to_onehot_y=True)
        self.ce_loss    = nn.CrossEntropyLoss()

    def forward(
        self,
        seg_pred: torch.Tensor,
        cls_pred: torch.Tensor,
        seg_target: torch.Tensor,
        cls_target: torch.Tensor,
    ) -> tuple[torch.Tensor, dict]:

        l_seg = self.dice_loss(seg_pred, seg_target)
        l_cls = self.ce_loss(cls_pred, cls_target)
        total = self.seg_weight * l_seg + self.cls_weight * l_cls

        return total, {"seg": l_seg.item(), "cls": l_cls.item()}