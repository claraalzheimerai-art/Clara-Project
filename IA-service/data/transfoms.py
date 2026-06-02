import torch
import torch.nn.functional as F
from monai.transforms import (
    Compose, RandFlipd, RandRotate90d,
    NormalizeIntensityd, RandGaussianNoised,
    ResizeWithPadOrCropd,
)
from config.config import cfg

def get_transforms(split: str = "train") -> Compose:
    """
    Devuelve pipeline de transformaciones según el split.
    'train' incluye augmentación. 'val' e 'inference' solo normalización.
    """
    size = list(cfg.data.image_size)   # [96, 96, 96]

    base = [
        ResizeWithPadOrCropd(keys=["image", "mask"], spatial_size=size),
        NormalizeIntensityd(keys=["image"], nonzero=True, channel_wise=True),
    ]

    augment = [
        RandFlipd(keys=["image", "mask"], prob=0.5, spatial_axis=0),
        RandFlipd(keys=["image", "mask"], prob=0.5, spatial_axis=1),
        RandRotate90d(keys=["image", "mask"], prob=0.3, max_k=3),
        RandGaussianNoised(keys=["image"], prob=0.2, mean=0.0, std=0.05),
    ]

    if split == "train":
        return Compose(base + augment)

    return Compose(base)