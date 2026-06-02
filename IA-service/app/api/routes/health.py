from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Estado"])


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "clara-ai-service",
        "version": settings.MODEL_VERSION,
        "env": settings.ENV,
        "device": settings.DEVICE
    }