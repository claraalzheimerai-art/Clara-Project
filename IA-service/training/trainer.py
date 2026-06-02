import torch
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from pathlib import Path
from tqdm import tqdm
import json

from core.model   import AlzheimerUNet
from core.losses  import CombinedLoss
from core.metrics import SegmentationMetrics
from config.config import cfg

class Trainer:
    """
    Motor de entrenamiento principal.
    Soporta entrenamiento inicial + fine-tuning incremental (autoaprendizaje).
    """

    def __init__(self, dataset, resume: bool = False):
        self.device  = torch.device("cpu")   # Windows sin GPU
        self.model   = AlzheimerUNet().to(self.device)
        self.loss_fn = CombinedLoss()
        self.metrics = SegmentationMetrics()
        self.history = {"train_loss": [], "val_loss": [], "dice": [], "iou": []}

        # Dividir dataset
        val_size   = int(len(dataset) * cfg.training.val_split)
        train_size = len(dataset) - val_size
        train_ds, val_ds = random_split(dataset, [train_size, val_size])

        self.train_loader = DataLoader(
            train_ds, batch_size=cfg.training.batch_size, shuffle=True
        )
        self.val_loader = DataLoader(
            val_ds, batch_size=1, shuffle=False
        )

        self.optimizer = optim.AdamW(
            self.model.parameters(), lr=cfg.training.learning_rate
        )
        self.scheduler = optim.lr_scheduler.CosineAnnealingLR(
            self.optimizer, T_max=cfg.training.epochs
        )

        cfg.training.checkpoint_dir.mkdir(exist_ok=True)

        if resume:
            self._load_checkpoint("best")

    # ── Entrenamiento completo ────────────────────────────────────────
    def train(self):
        best_dice   = 0.0
        no_improve  = 0

        for epoch in range(1, cfg.training.epochs + 1):
            train_loss = self._train_epoch()
            val_loss, dice, iou = self._val_epoch()
            self.scheduler.step()

            self.history["train_loss"].append(train_loss)
            self.history["val_loss"].append(val_loss)
            self.history["dice"].append(dice)
            self.history["iou"].append(iou)

            print(
                f"Epoch {epoch:03d} | "
                f"train={train_loss:.4f} val={val_loss:.4f} "
                f"dice={dice:.4f} iou={iou:.4f}"
            )

            # Guarda el mejor modelo
            if dice > best_dice:
                best_dice  = dice
                no_improve = 0
                self._save_checkpoint("best")
            else:
                no_improve += 1

            # Early stopping
            if no_improve >= cfg.training.patience:
                print(f"Early stopping en epoch {epoch}")
                break

        self._save_history()

    # ── Fine-tuning incremental (autoaprendizaje) ─────────────────────
    def fine_tune(self, new_dataset, epochs: int = 10):
        """
        Reentrenamiento incremental con nuevas imágenes corregidas por médicos.
        Usa learning rate muy bajo para no olvidar lo aprendido (evita
        catastrophic forgetting).
        """
        self._load_checkpoint("best")

        # LR bajo para autoaprendizaje
        for g in self.optimizer.param_groups:
            g["lr"] = cfg.training.fine_tune_lr

        loader = DataLoader(
            new_dataset, batch_size=1, shuffle=True
        )

        print(f"Fine-tuning con {len(new_dataset)} nuevas muestras...")
        for epoch in range(1, epochs + 1):
            loss = self._train_epoch(loader=loader)
            print(f"Fine-tune epoch {epoch:02d} | loss={loss:.4f}")

        self._save_checkpoint("finetuned")

    # ── Internos ──────────────────────────────────────────────────────
    def _train_epoch(self, loader=None) -> float:
        self.model.train()
        loader    = loader or self.train_loader
        total     = 0.0

        for batch in tqdm(loader, leave=False):
            imgs, seg_masks, cls_labels = (
                batch["image"].to(self.device),
                batch["mask"].to(self.device),
                batch["label"].to(self.device),
            )
            self.optimizer.zero_grad()
            seg_pred, cls_pred = self.model(imgs)
            loss, _ = self.loss_fn(seg_pred, cls_pred, seg_masks, cls_labels)
            loss.backward()
            self.optimizer.step()
            total += loss.item()

        return total / len(loader)

    def _val_epoch(self) -> tuple[float, float, float]:
        self.model.eval()
        self.metrics.reset()
        total = 0.0

        with torch.no_grad():
            for batch in self.val_loader:
                imgs, seg_masks, cls_labels = (
                    batch["image"].to(self.device),
                    batch["mask"].to(self.device),
                    batch["label"].to(self.device),
                )
                seg_pred, cls_pred = self.model(imgs)
                loss, _ = self.loss_fn(seg_pred, cls_pred, seg_masks, cls_labels)
                total  += loss.item()

                pred_bin = torch.argmax(seg_pred, dim=1, keepdim=True)
                self.metrics.update(pred_bin, seg_masks)

        m = self.metrics.compute()
        return total / len(self.val_loader), m["dice"], m["iou"]

    def _save_checkpoint(self, name: str):
        path = cfg.training.checkpoint_dir / f"{name}.pt"
        torch.save({
            "model_state":     self.model.state_dict(),
            "optimizer_state": self.optimizer.state_dict(),
            "history":         self.history,
        }, path)
        print(f"Checkpoint guardado: {path}")

    def _load_checkpoint(self, name: str):
        path = cfg.training.checkpoint_dir / f"{name}.pt"
        if not path.exists():
            return
        ckpt = torch.load(path, map_location=self.device)
        self.model.load_state_dict(ckpt["model_state"])
        self.history = ckpt.get("history", self.history)
        print(f"Checkpoint cargado: {path}")

    def _save_history(self):
        out = cfg.training.log_dir / "history.json"
        cfg.training.log_dir.mkdir(exist_ok=True)
        with open(out, "w") as f:
            json.dump(self.history, f, indent=2)