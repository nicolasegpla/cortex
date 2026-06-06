import pytest
from cryptography.fernet import Fernet

from app.services.encryption_service import EncryptionService


class TestEncryptionService:
    def test_encrypt_returns_v1_prefixed_string(self):
        key = Fernet.generate_key()
        service = EncryptionService(key=key)
        ciphertext = service.encrypt("hello world")
        assert isinstance(ciphertext, str)
        assert ciphertext.startswith("v1:")

    def test_decrypt_roundtrips_plaintext(self):
        key = Fernet.generate_key()
        service = EncryptionService(key=key)
        plaintext = "sensitive api key 12345"
        ciphertext = service.encrypt(plaintext)
        decrypted = service.decrypt(ciphertext)
        assert decrypted == plaintext

    def test_decrypt_with_wrong_key_raises_valueerror(self):
        key1 = Fernet.generate_key()
        key2 = Fernet.generate_key()
        service1 = EncryptionService(key=key1)
        service2 = EncryptionService(key=key2)
        ciphertext = service1.encrypt("secret")
        with pytest.raises(ValueError):
            service2.decrypt(ciphertext)

    def test_key_rotation_via_multifernet(self):
        old_key = Fernet.generate_key()
        new_key = Fernet.generate_key()
        old_service = EncryptionService(key=old_key)
        rotated_service = EncryptionService(key=new_key, previous_keys=[old_key])
        plaintext = "data encrypted with old key"
        old_ciphertext = old_service.encrypt(plaintext)
        assert rotated_service.decrypt(old_ciphertext) == plaintext
        new_ciphertext = rotated_service.encrypt(plaintext)
        assert rotated_service.decrypt(new_ciphertext) == plaintext
        with pytest.raises(ValueError):
            old_service.decrypt(new_ciphertext)

    def test_decrypt_invalid_format_raises_valueerror(self):
        key = Fernet.generate_key()
        service = EncryptionService(key=key)
        with pytest.raises(ValueError):
            service.decrypt("invalid")

    def test_decrypt_tampered_ciphertext_raises_valueerror(self):
        key = Fernet.generate_key()
        service = EncryptionService(key=key)
        ciphertext = service.encrypt("hello")
        tampered = ciphertext[:-1] + ("X" if ciphertext[-1] != "X" else "Y")
        with pytest.raises(ValueError):
            service.decrypt(tampered)
