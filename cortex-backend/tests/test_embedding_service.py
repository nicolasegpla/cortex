"""Unit tests for EmbeddingService canonical text, hash, and OpenAI call."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import Settings
from app.services.embedding_service import EmbeddingService


class TestEmbeddingService:
    """Test the embedding pipeline building blocks."""

    @pytest.fixture
    def settings(self):
        """Settings with a fake OpenAI key for unit tests."""
        return Settings(
            OPENAI_API_KEY="sk-test-key",
            EMBEDDING_MODEL="text-embedding-3-small",
            EMBEDDING_DIMENSION=1536,
            EMBEDDINGS_ENABLED=True,
        )

    @pytest.fixture
    def service(self, settings):
        """EmbeddingService wired to test settings."""
        return EmbeddingService(settings=settings)

    @pytest.fixture
    def sample_brewery(self):
        """Full brewery dict with PII/metadata that must be excluded."""
        return {
            "id": "00000000-0000-0000-0000-000000000001",
            "nombre_cerveceria": "Cerveza Artesanal S.A.",
            "razon_social": "Cerveza Artesanal Sociedad Anonima",
            "nombre_contacto": "Maria Gomez",
            "nombre_cervecero": "Juan Perez",
            "nit": "900123456-7",
            "celular_1": "3001234567",
            "celular_2": "3007654321",
            "correo": "brew@example.com",
            "direccion": "Calle 123",
            "ciudad": "Bogotá",
            "pais": "Colombia",
            "tipo_operacion": "planta_propia",
            "estilos_cerveza": ["Stout", "IPA"],
            "maltas_utilizadas": ["Pilsen"],
            "lupulos_utilizados": ["Cascade"],
            "levaduras_utilizadas": ["US-05"],
            "utiliza_otros_productos": True,
            "marca_equipo": "Ss Brewtech",
            "capacidad_brewhouse": "500L",
            "capacidad_fermentacion": "1000L",
            "litros_mes": 5000,
            "calidad_equipo": "Alta",
            "formatos_venta": ["botella", "lata"],
            "donde_vende": "Supermercados",
            "observaciones": "Excelente cliente",
            "oportunidades": "Expandir distribución",
            "embedding": [0.1, 0.2],
            "embedding_status": "pending",
            "embedding_model": "old-model",
            "embedding_source_hash": "old-hash",
            "embedding_updated_at": "2026-01-01T00:00:00Z",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        }

    # --- canonical text ---

    def test_build_canonical_text_includes_contact_name(self, service, sample_brewery):
        text = service.build_canonical_text(sample_brewery)

        assert "Contacto: Maria Gomez" in text

    def test_build_canonical_text_excludes_pii_and_metadata(
        self, service, sample_brewery
    ):
        text = service.build_canonical_text(sample_brewery)

        assert "900123456-7" not in text
        assert "3001234567" not in text
        assert "3007654321" not in text
        assert "brew@example.com" not in text
        assert "00000000-0000-0000-0000-000000000001" not in text
        assert "2026-01-01" not in text
        assert "old-model" not in text
        assert "old-hash" not in text
        # The embedding metadata columns themselves must not appear as content
        assert "embedding" not in text.lower()

    def test_build_canonical_text_sorts_arrays(self, service, sample_brewery):
        text = service.build_canonical_text(sample_brewery)

        assert "IPA, Stout" in text
        assert "Stout, IPA" not in text
        assert "botella, lata" in text

    def test_build_canonical_text_is_deterministic(self, service, sample_brewery):
        first = service.build_canonical_text(sample_brewery)
        second = service.build_canonical_text(sample_brewery)

        assert first == second
        assert len(first) > 0

    def test_build_canonical_text_uses_human_readable_labels(
        self, service, sample_brewery
    ):
        text = service.build_canonical_text(sample_brewery)

        assert "Cervecería: Cerveza Artesanal S.A." in text
        assert "Ciudad: Bogotá" in text
        assert "País: Colombia" in text

    def test_build_canonical_text_renders_booleans_as_si_no(self, service, sample_brewery):
        sample_brewery["utiliza_otros_productos"] = True
        text = service.build_canonical_text(sample_brewery)

        assert "Utiliza otros productos: Sí" in text
        assert "True" not in text

        sample_brewery["utiliza_otros_productos"] = False
        text = service.build_canonical_text(sample_brewery)

        assert "Utiliza otros productos: No" in text
        assert "False" not in text

    def test_build_canonical_text_filters_none_from_arrays(self, service, sample_brewery):
        sample_brewery["estilos_cerveza"] = ["Stout", None, "IPA"]
        text = service.build_canonical_text(sample_brewery)

        assert "IPA, Stout" in text
        assert "None" not in text

    # --- hash ---

    def test_compute_hash_is_sha256_hex(self, service):
        text = "deterministic input"

        hash_value = service.compute_hash(text)

        assert isinstance(hash_value, str)
        assert len(hash_value) == 64
        int(hash_value, 16)  # valid hex

    def test_compute_hash_is_deterministic(self, service):
        text = "same input"

        assert service.compute_hash(text) == service.compute_hash(text)

    def test_compute_hash_changes_with_input(self, service):
        assert service.compute_hash("a") != service.compute_hash("b")

    # --- OpenAI embedding generation ---

    @pytest.mark.asyncio
    async def test_generate_embedding_success_returns_vector(self, service, settings):
        expected_vector = [0.01] * settings.embedding_dimension
        mock_embedding = MagicMock()
        mock_embedding.embedding = expected_vector
        mock_response = MagicMock()
        mock_response.data = [mock_embedding]

        service._client = MagicMock()
        service._client.embeddings.create = AsyncMock(return_value=mock_response)

        result = await service.generate_embedding("canonical text")

        assert result == expected_vector
        service._client.embeddings.create.assert_awaited_once_with(
            input="canonical text",
            model=settings.embedding_model,
            dimensions=settings.embedding_dimension,
        )

    def test_openai_client_is_created_once_and_reused(self, settings):
        with patch(
            "app.services.embedding_service.AsyncOpenAI"
        ) as mock_client_class:
            service = EmbeddingService(settings=settings)

        assert service._client is mock_client_class.return_value
        mock_client_class.assert_called_once_with(api_key=settings.openai_api_key)

    @pytest.mark.asyncio
    async def test_generate_embedding_without_key_raises(self):
        settings = Settings(
            OPENAI_API_KEY=None,
            EMBEDDING_MODEL="text-embedding-3-small",
            EMBEDDING_DIMENSION=1536,
            EMBEDDINGS_ENABLED=True,
        )
        service = EmbeddingService(settings=settings)

        assert service._client is None
        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            await service.generate_embedding("text")

    @pytest.mark.asyncio
    async def test_generate_embedding_propagates_openai_error(self, service):
        service._client = MagicMock()
        service._client.embeddings.create = AsyncMock(
            side_effect=RuntimeError("OpenAI request failed")
        )

        with pytest.raises(RuntimeError, match="OpenAI request failed"):
            await service.generate_embedding("text")

    @pytest.mark.asyncio
    async def test_generate_embedding_rejects_empty_text(self, service):
        with pytest.raises(ValueError, match="empty"):
            await service.generate_embedding("")

        with pytest.raises(ValueError, match="empty"):
            await service.generate_embedding("   ")
