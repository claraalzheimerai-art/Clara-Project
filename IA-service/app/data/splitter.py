import json
import random
from pathlib import Path
from app.core.logger import logger


def split_dataset(
    processed_dir: str,
    splits_dir: str,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    seed: int = 42
) -> dict:
    """
    Divide el dataset procesado en train/val/test por clase (stratified).
    Guarda los splits en splits_dir como JSON.
    Ratios: 70% train, 15% val, 15% test
    """
    random.seed(seed)
    processed_path = Path(processed_dir)
    splits = {"train": [], "val": [], "test": []}

    for label_dir in sorted(processed_path.iterdir()):
        if not label_dir.is_dir():
            continue

        label = label_dir.name
        files = sorted(label_dir.glob("*.png"))
        paths = [str(f) for f in files]
        random.shuffle(paths)

        n = len(paths)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)

        train = [{"path": p, "label": label} for p in paths[:n_train]]
        val   = [{"path": p, "label": label} for p in paths[n_train:n_train + n_val]]
        test  = [{"path": p, "label": label} for p in paths[n_train + n_val:]]

        splits["train"].extend(train)
        splits["val"].extend(val)
        splits["test"].extend(test)

        logger.info(f"{label}: {len(train)} train | {len(val)} val | {len(test)} test")

    # Mezclar splits finales
    for key in splits:
        random.shuffle(splits[key])

    # Guardar JSON
    Path(splits_dir).mkdir(parents=True, exist_ok=True)
    for key, data in splits.items():
        out = Path(splits_dir) / f"{key}.json"
        with open(out, "w") as f:
            json.dump(data, f, indent=2)

    summary = {k: len(v) for k, v in splits.items()}
    logger.info(f"Splits guardados en {splits_dir}: {summary}")
    return summary