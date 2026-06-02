"""
Script principal del pipeline de datos CLARA.

Uso:
    python -m app.data.run_pipeline \
        --raw_dir app/data/raw \
        --processed_dir app/data/processed \
        --splits_dir app/data/splits
"""
import argparse
from app.data.preprocessor import preprocess_dataset
from app.data.splitter import split_dataset
from app.core.logger import logger


def run(raw_dir: str, processed_dir: str, splits_dir: str):
    logger.info("=" * 50)
    logger.info("CLARA — Pipeline de preprocesamiento iniciado")
    logger.info("=" * 50)

    # Paso 1 — Preprocesar imágenes NIfTI → PNG
    logger.info("Paso 1/2: Preprocesando imágenes...")
    summary = preprocess_dataset(raw_dir, processed_dir)
    logger.info(f"Resultado: {summary}")

    total = sum(v for k, v in summary.items() if k != "errores")
    if total == 0:
        logger.error("No se procesó ninguna imagen. Verifica la estructura de carpetas.")
        logger.error(f"Esperada: {raw_dir}/CN/, {raw_dir}/MCI/, {raw_dir}/AD/")
        return

    # Paso 2 — Dividir en train/val/test
    logger.info("Paso 2/2: Dividiendo dataset...")
    splits = split_dataset(processed_dir, splits_dir)

    logger.info("=" * 50)
    logger.info("Pipeline completado exitosamente")
    logger.info(f"Train: {splits['train']} | Val: {splits['val']} | Test: {splits['test']}")
    logger.info("=" * 50)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipeline de datos CLARA")
    parser.add_argument("--raw_dir",       default="app/data/raw")
    parser.add_argument("--processed_dir", default="app/data/processed")
    parser.add_argument("--splits_dir",    default="app/data/splits")
    args = parser.parse_args()

    run(args.raw_dir, args.processed_dir, args.splits_dir)


"""

## Estructura esperada de tus datos cuando lleguen

Cuando descargues OASIS-1, organiza los archivos así antes de correr el pipeline:
```
app/data/raw/
├── CN/
│   ├── OAS1_0001_MR1.nii.gz
│   ├── OAS1_0002_MR1.nii.gz
│   └── ...
├── MCI/
│   └── (vacío por ahora — llegará con ADNI)
└── AD/
    ├── OAS1_0351_MR1.nii.gz
    └── ...
"""