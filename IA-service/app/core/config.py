import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Servidor
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    ENV: str = os.getenv("ENV", "development")

    # Modelo
    MODEL_NAME: str = os.getenv("MODEL_NAME", "resnet50")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "app/models/weights/clara_model.pth")
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "1.0.0")

    # Imagen
    IMAGE_SIZE: int = int(os.getenv("IMAGE_SIZE", "224"))
    DEVICE: str = os.getenv("DEVICE", "cpu")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "debug")
    LOG_DIR: str = os.getenv("LOG_DIR", "logs")

    @property
    def IS_DEVELOPMENT(self) -> bool:
        return self.ENV == "development"

settings = Settings()