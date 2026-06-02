import logging
import os
from app.core.config import settings

os.makedirs(settings.LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.DEBUG),
    format="[%(asctime)s] %(levelname)s — %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"{settings.LOG_DIR}/clara-ai.log", encoding="utf-8"),
    ],
)

logger = logging.getLogger("clara-ai-service")