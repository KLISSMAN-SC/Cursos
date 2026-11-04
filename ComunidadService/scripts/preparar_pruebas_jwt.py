"""Genera JWT locales para probar la UI antes de integrar UsuarioService.

No crea usuarios reales ni expone un endpoint de inicio de sesión. La clave
privada y los tokens quedan fuera de Git y fuera de los contenedores del backend.
"""

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.config import SERVICE_ROOT, Settings


def prepare(root: Path = SERVICE_ROOT, *, settings: Settings | None = None) -> Path:
    settings = settings if settings is not None else Settings()
    private_dir = root / ".local-auth"
    public_dir = root / "config" / "jwt"
    private_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)
    private_path = private_dir / "pruebas-private.pem"
    public_path = public_dir / "usuarios-public.pem"
    if private_path.exists():
        private = serialization.load_pem_private_key(private_path.read_bytes(), password=None)
    else:
        if public_path.exists():
            raise RuntimeError(
                "Ya existe una clave pública. No se reemplazará por una clave de pruebas."
            )
        private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        private_path.write_bytes(
            private.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )
        )
        private_path.chmod(0o600)
    public = private.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    if public_path.exists() and public_path.read_bytes() != public:
        raise RuntimeError("La clave pública no coincide con la de pruebas; no se sobrescribirá.")
    public_path.write_bytes(public)
    public_path.chmod(0o644)
    now = datetime.now(UTC)
    sessions = {}
    for label, identifier, role in [("estudiante", 1, "ESTUDIANTE"), ("administrador", 2, "ADMIN")]:
        sessions[label] = jwt.encode(
            {
                "sub": str(identifier),
                "rol": role,
                "iss": settings.jwt_issuer,
                "aud": settings.jwt_audience,
                "iat": now,
                "exp": now + timedelta(hours=8),
            },
            private,
            algorithm="RS256",
        )
    destination = private_dir / "sesiones.json"
    destination.write_text(json.dumps(sessions, indent=2), encoding="utf-8")
    destination.chmod(0o600)
    return destination


if __name__ == "__main__":
    destination = prepare()
    print("Sesiones locales de prueba guardadas en", destination)
    print("Vigencia: 8 horas. No usar esta clave como identidad real de UsuarioService.")
