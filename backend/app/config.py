from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    REDIS_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
