import torch
from monai.metrics import DiceMetric, MeanIoU

class SegmentationMetrics:
    """Dice Score e IoU para evaluar calidad de segmentación."""

    def __init__(self, num_classes: int = 4):
        self.dice = DiceMetric(include_background=False, reduction="mean")
        self.iou  = MeanIoU(include_background=False, reduction="mean")

    def update(self, pred: torch.Tensor, target: torch.Tensor):
        self.dice(pred, target)
        self.iou(pred, target)

    def compute(self) -> dict:
        return {
            "dice": self.dice.aggregate().item(),
            "iou":  self.iou.aggregate().item(),
        }

    def reset(self):
        self.dice.reset()
        self.iou.reset()