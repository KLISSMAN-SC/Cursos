from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

SERVICE_NAME = "ComunidadService"
SERVICE_VERSION = "0.2.0"
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
    jwt_public_key_file: str = "config/jwt/usuarios-public.pem"
    jwt_issuer: str = "UsuarioService"
    jwt_audience: str = "ComunidadService"
    cors_origins: list[str] = ["http://localhost:4200"]
    catalogo_base_url: str = ""
    catalogo_service_token: SecretStr = SecretStr("")
    catalogo_timeout: int = Field(default=5, ge=1, le=15)
    rabbitmq_host: str = "127.0.0.1"
    rabbitmq_port: int = Field(default=5672, ge=1, le=65535)
    rabbitmq_user: str = "comunidad"
    rabbitmq_password: SecretStr = SecretStr("")
    rabbitmq_vhost: str = "/"
    event_exchange: str = "cursos.eventos"
    event_queue: str = "comunidad.modulos"
    event_routing_key: str = "progreso.modulo_completado.v1"
    event_max_retries: int = Field(default=3, ge=0, le=10)
    event_retry_delay_ms: int = Field(default=10000, ge=100, le=300000)

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
