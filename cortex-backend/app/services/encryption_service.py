import os

from cryptography.fernet import Fernet, MultiFernet
from dotenv import load_dotenv

from app.core.config import get_settings

load_dotenv()


def _validate_fernet_key(key: bytes) -> bytes:
    try:
        Fernet(key)
    except Exception as exc:
        raise ValueError("Invalid Fernet key") from exc
    return key


def _load_key_from_env() -> bytes:
    settings = get_settings()
    raw = settings.encryption_key or os.getenv("ENCRYPTION_KEY")
    if raw is None:
        raise ValueError("ENCRYPTION_KEY is not set")
    key = raw.encode("utf-8") if isinstance(raw, str) else raw
    return _validate_fernet_key(key)


class EncryptionService:
    def __init__(self, key: bytes | None = None, previous_keys: list[bytes] | None = None) -> None:
        if key is None:
            key = _load_key_from_env()
        else:
            key = _validate_fernet_key(key)
        fernets = [Fernet(key)]
        if previous_keys:
            validated = [_validate_fernet_key(k) for k in previous_keys]
            fernets.extend(Fernet(k) for k in validated)
        self._multi_fernet = MultiFernet(fernets)

    def encrypt(self, plaintext: str) -> str:
        ciphertext = self._multi_fernet.encrypt(plaintext.encode("utf-8"))
        return f"v1:{ciphertext.decode('utf-8')}"

    def decrypt(self, ciphertext: str) -> str:
        if not ciphertext.startswith("v1:"):
            raise ValueError("Invalid ciphertext format")
        token = ciphertext[3:].encode("utf-8")
        try:
            plaintext = self._multi_fernet.decrypt(token)
        except Exception as exc:
            raise ValueError("Decryption failed") from exc
        return plaintext.decode("utf-8")
