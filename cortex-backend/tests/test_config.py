"""Tests for application settings and configuration."""

import pytest

from app.core.config import Settings


class TestSettings:
    """Test Pydantic settings defaults and aliases."""

    def test_resend_api_key_setting(self) -> None:
        settings = Settings(RESEND_API_KEY='re_test_key_123')

        assert settings.resend_api_key == 're_test_key_123'

    def test_resend_from_email_defaults_to_noreply(self) -> None:
        settings = Settings()

        assert settings.resend_from_email == 'noreply@cortex.local'

class TestEmbeddingSettings:
    """Test OpenAI embedding-related settings."""

    def test_openai_api_key_defaults_to_none(self) -> None:
        settings = Settings()

        assert settings.openai_api_key is None

    def test_embedding_model_defaults_to_text_embedding_3_small(self) -> None:
        settings = Settings()

        assert settings.embedding_model == 'text-embedding-3-small'

    def test_embedding_dimension_defaults_to_1536(self) -> None:
        settings = Settings()

        assert settings.embedding_dimension == 1536

    def test_embeddings_enabled_defaults_to_true(self) -> None:
        settings = Settings()

        assert settings.embeddings_enabled is True

    def test_embedding_settings_can_be_overridden_by_aliases(self) -> None:
        settings = Settings(
            OPENAI_API_KEY='sk_override',
            EMBEDDING_MODEL='text-embedding-3-large',
            EMBEDDINGS_ENABLED=False,
        )

        assert settings.openai_api_key == 'sk_override'
        assert settings.embedding_model == 'text-embedding-3-large'
        assert settings.embedding_dimension == 1536
        assert settings.embeddings_enabled is False

    def test_embedding_dimension_must_match_db_schema(self) -> None:
        with pytest.raises(ValueError, match='1536'):
            Settings(EMBEDDING_DIMENSION=3072)
