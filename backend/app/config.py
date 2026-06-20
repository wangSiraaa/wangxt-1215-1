from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "城市内涝泵站调度系统"

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/pump_dispatch"
    REDIS_URL: str = "redis://localhost:6379/0"

    SENSOR_QUEUE_KEY: str = "sensor_data_queue"
    SENSOR_DATA_BATCH_SIZE: int = 100

    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    SENSOR_OFFLINE_THRESHOLD_SECONDS: int = 300
    PUMP_CURRENT_NORMAL_MIN: float = 10.0
    PUMP_CURRENT_NORMAL_MAX: float = 100.0

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
