"""
Entrenamiento del ResNet50 para clasificación de Alzheimer.

Uso:
    python train_resnet.py
    python train_resnet.py --splits_dir app/data/splits --epochs 30
    python train_resnet.py --resume          (continúa desde pesos existentes)

Los pesos entrenados se guardan en app/models/weights/clara_model.pth
"""

import argparse
import json
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from tqdm import tqdm


CLASSES  = ["CN", "MCI", "AD"]
LABEL_IDX = {c: i for i, c in enumerate(CLASSES)}
WEIGHTS  = "app/models/weights/clara_model.pth"
DEVICE   = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ── Dataset ───────────────────────────────────────────────────────────────────

class SplitDataset(Dataset):
    """Lee los splits JSON generados por app/data/splitter.py."""

    def __init__(self, json_path: Path, transform):
        with open(json_path) as f:
            self.samples = json.load(f)
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item  = self.samples[idx]
        image = Image.open(item["path"]).convert("RGB")
        label = LABEL_IDX[item["label"]]
        return self.transform(image), label


# ── Transforms ────────────────────────────────────────────────────────────────

def get_transforms(split: str) -> transforms.Compose:
    imagenet_norm = transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    )
    if split == "train":
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            imagenet_norm,
        ])
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        imagenet_norm,
    ])


# ── Modelo ────────────────────────────────────────────────────────────────────

def build_model() -> nn.Module:
    model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
    model.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(model.fc.in_features, len(CLASSES)),
    )
    return model.to(DEVICE)


# ── Loop de entrenamiento ─────────────────────────────────────────────────────

def run_epoch(model, loader, criterion, optimizer, training: bool) -> tuple[float, float]:
    model.train(training)
    total_loss = correct = total = 0

    with torch.set_grad_enabled(training):
        for images, labels in tqdm(loader, leave=False):
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            outputs = model(images)
            loss    = criterion(outputs, labels)

            if training:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

            total_loss += loss.item()
            correct    += (outputs.argmax(1) == labels).sum().item()
            total      += labels.size(0)

    return total_loss / len(loader), correct / total


# ── Entrenamiento principal ───────────────────────────────────────────────────

def train(splits_dir: str, epochs: int, batch_size: int, lr: float, patience: int, resume: bool):
    splits = Path(splits_dir)
    train_json = splits / "train.json"
    val_json   = splits / "val.json"

    if not train_json.exists():
        raise FileNotFoundError(
            f"No se encontró {train_json}.\n"
            "Ejecuta primero:\n"
            "  python -m app.data.run_pipeline"
        )

    train_ds = SplitDataset(train_json, get_transforms("train"))
    val_ds   = SplitDataset(val_json,   get_transforms("val"))

    # Distribución de clases
    from collections import Counter
    train_labels = [s["label"] for s in train_ds.samples]
    print(f"Train: {len(train_ds)} imágenes — {dict(Counter(train_labels))}")
    print(f"Val:   {len(val_ds)} imágenes")
    print(f"Dispositivo: {DEVICE}\n")

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,  num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=batch_size, shuffle=False, num_workers=0)

    model     = build_model()
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    if resume and Path(WEIGHTS).exists():
        model.load_state_dict(torch.load(WEIGHTS, map_location=DEVICE))
        print(f"Pesos cargados desde {WEIGHTS} — continuando entrenamiento\n")

    best_val_acc = 0.0
    no_improve   = 0
    history      = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}

    for epoch in range(1, epochs + 1):
        train_loss, train_acc = run_epoch(model, train_loader, criterion, optimizer, training=True)
        val_loss,   val_acc   = run_epoch(model, val_loader,   criterion, None,      training=False)
        scheduler.step()

        history["train_loss"].append(round(train_loss, 4))
        history["val_loss"].append(round(val_loss, 4))
        history["train_acc"].append(round(train_acc, 4))
        history["val_acc"].append(round(val_acc, 4))

        print(
            f"Epoch {epoch:03d}/{epochs} | "
            f"train loss={train_loss:.4f} acc={train_acc:.2%} | "
            f"val loss={val_loss:.4f} acc={val_acc:.2%}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            no_improve   = 0
            Path(WEIGHTS).parent.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), WEIGHTS)
            print(f"  -> Mejor modelo guardado (val_acc={val_acc:.2%})")
        else:
            no_improve += 1
            if no_improve >= patience:
                print(f"Early stopping en epoch {epoch} (sin mejora en {patience} epochs)")
                break

    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    with open(log_dir / "resnet_history.json", "w") as f:
        json.dump(history, f, indent=2)

    print(f"\nEntrenamiento completado. Mejor val_acc: {best_val_acc:.2%}")
    print(f"Pesos guardados en: {WEIGHTS}")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Entrenamiento ResNet50 — CLARA AI")
    parser.add_argument("--splits_dir",  default="app/data/splits")
    parser.add_argument("--epochs",      type=int,   default=30)
    parser.add_argument("--batch_size",  type=int,   default=16)
    parser.add_argument("--lr",          type=float, default=1e-4)
    parser.add_argument("--patience",    type=int,   default=8)
    parser.add_argument("--resume",      action="store_true",
                        help="Continuar entrenamiento desde pesos existentes")
    args = parser.parse_args()

    train(
        splits_dir=args.splits_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        patience=args.patience,
        resume=args.resume,
    )
