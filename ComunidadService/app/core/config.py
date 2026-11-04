from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

SERVICE_NAME = "ComunidadService"
SERVICE_VERSION = "0.1.0"
SERVICE_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVICE_ROOT / ".env",
        env_file_encoding="utf-8",
        env_prefix="COMUNIDAD_",
        extra="ignore",
    )

    db_host: str = "127.0.0.1"
    db_port: int = Field(default=5432, ge=1, le=65535)
    db_name: str = "comunidad_db"
    db_user: str = "comunidad_user"
    db_password: SecretStr = SecretStr("")
    db_connect_timeout: int = Field(default=5, ge=1, le=30)
    cors_origins: list[str] = ["http://localhost:4200"]

    def database_url(self) -> URL:
        # URL.create conserva correctamente contraseñas con @, /, # o espacios.
        return URL.create(
            "postgresql+psycopg",
            username=self.db_user,
            password=self.db_password.get_secret_value(),
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        )
