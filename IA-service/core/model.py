import torch
import torch.nn as nn
from core.blocks import ConvBlock, DownBlock, UpBlock
from config.config import cfg

class AlzheimerUNet(nn.Module):
    """
    3D U-Net para segmentación y clasificación de Alzheimer.
    Arquitectura encoder-decoder con skip connections.
    Dos cabezas: segmentación (píxel a píxel) + clasificación (global).
    """

    def __init__(self):
        super().__init__()
        c = cfg.model.channels       # (16, 32, 64, 128, 256)
        d = cfg.model.dropout
        ic = cfg.model.in_channels
        oc = cfg.model.out_channels

        # ── Encoder ──────────────────────────────────────────────────
        self.down1 = DownBlock(ic,   c[0], d)
        self.down2 = DownBlock(c[0], c[1], d)
        self.down3 = DownBlock(c[1], c[2], d)
        self.down4 = DownBlock(c[2], c[3], d)

        # ── Bottleneck ───────────────────────────────────────────────
        self.bottleneck = ConvBlock(c[3], c[4], d)

        # ── Decoder (segmentación) ───────────────────────────────────
        self.up4 = UpBlock(c[4], c[3], d)
        self.up3 = UpBlock(c[3], c[2], d)
        self.up2 = UpBlock(c[2], c[1], d)
        self.up1 = UpBlock(c[1], c[0], d)

        # ── Cabeza 1: Segmentación ───────────────────────────────────
        self.seg_head = nn.Conv3d(c[0], oc, kernel_size=1)

        # ── Cabeza 2: Clasificación global ───────────────────────────
        self.cls_head = nn.Sequential(
            nn.AdaptiveAvgPool3d(1),
            nn.Flatten(),
            nn.Linear(c[4], 128),
            nn.ReLU(inplace=True),
            nn.Dropout(d),
            nn.Linear(128, oc),
        )

    def forward(self, x: torch.Tensor):
        # Encoder
        x1, skip1 = self.down1(x)
        x2, skip2 = self.down2(x1)
        x3, skip3 = self.down3(x2)
        x4, skip4 = self.down4(x3)

        # Bottleneck
        b = self.bottleneck(x4)

        # Clasificación (desde bottleneck — visión global)
        cls_logits = self.cls_head(b)

        # Decoder
        d4 = self.up4(b,  skip4)
        d3 = self.up3(d4, skip3)
        d2 = self.up2(d3, skip2)
        d1 = self.up1(d2, skip1)

        # Segmentación (resolución original)
        seg_logits = self.seg_head(d1)

        return seg_logits, cls_logits