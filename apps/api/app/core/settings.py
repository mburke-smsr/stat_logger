from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./smsr.db"
    jwt_secret: str = "dev-secret"
    cors_origins: str = "http://localhost:5173"
    cookie_secure: int = 0  # 1 when behind HTTPS

settings = Settings()
