from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.core.logger import logger

app = FastAPI(
    title="CLARA AI Service",
    description="Servicio de clasificación de imágenes MRI para detección de Alzheimer",
    version=settings.MODEL_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    logger.info("CLARA AI Service iniciado")
    logger.info(f"Entorno: {settings.ENV} | Dispositivo: {settings.DEVICE}")