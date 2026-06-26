"""Embedding generation service for brewery records."""

import hashlib
from typing import Any

from openai import AsyncOpenAI

from app.core.config import Settings


class EmbeddingService:
    """Build canonical text, compute hashes, and generate OpenAI embeddings."""

    CANONICAL_FIELDS = [
        "nombre_cerveceria",
        "razon_social",
        "nombre_contacto",
        "nombre_cervecero",
        "direccion",
        "ciudad",
        "pais",
        "tipo_operacion",
        "estilos_cerveza",
        "maltas_utilizadas",
        "lupulos_utilizados",
        "levaduras_utilizadas",
        "utiliza_otros_productos",
        "marca_equipo",
        "capacidad_brewhouse",
        "capacidad_fermentacion",
        "litros_mes",
        "calidad_equipo",
        "formatos_venta",
        "donde_vende",
        "observaciones",
        "oportunidades",
    ]

    FIELD_LABELS = {
        "nombre_cerveceria": "Cervecería",
        "razon_social": "Razón social",
        "nombre_contacto": "Contacto",
        "nombre_cervecero": "Cervecero",
        "direccion": "Dirección",
        "ciudad": "Ciudad",
        "pais": "País",
        "tipo_operacion": "Tipo de operación",
        "estilos_cerveza": "Estilos de cerveza",
        "maltas_utilizadas": "Maltas utilizadas",
        "lupulos_utilizados": "Lúpulos utilizados",
        "levaduras_utilizadas": "Levaduras utilizadas",
        "utiliza_otros_productos": "Utiliza otros productos",
        "marca_equipo": "Marca de equipo",
        "capacidad_brewhouse": "Capacidad brewhouse",
        "capacidad_fermentacion": "Capacidad de fermentación",
        "litros_mes": "Litros al mes",
        "calidad_equipo": "Calidad de equipo",
        "formatos_venta": "Formatos de venta",
        "donde_vende": "Dónde vende",
        "observaciones": "Observaciones",
        "oportunidades": "Oportunidades",
    }

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client: AsyncOpenAI | None = None
        if settings.openai_api_key:
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    def build_canonical_text(self, brewery: dict[str, Any]) -> str:
        """Build a deterministic, labeled canonical text from a brewery row.

        Excludes PII, timestamps, and embedding metadata by only iterating over
        the known semantic field list. Booleans render as Sí/No and array items
        that are None are filtered out before sorting.
        """
        parts: list[str] = []
        for field in self.CANONICAL_FIELDS:
            value = brewery.get(field)
            if value is None:
                continue
            if isinstance(value, bool):
                value = "Sí" if value else "No"
            elif isinstance(value, list):
                value = [str(item) for item in value if item is not None]
                if not value:
                    continue
                value = ", ".join(sorted(value))
            else:
                value = str(value)
                if value == "":
                    continue
            label = self.FIELD_LABELS[field]
            parts.append(f"{label}: {value}")
        return "\n".join(parts)

    def compute_hash(self, text: str) -> str:
        """Return the SHA-256 hex digest of the canonical text."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    async def generate_embedding(self, text: str) -> list[float]:
        """Generate an embedding vector for the given text using OpenAI.

        Raises:
            ValueError: If OPENAI_API_KEY is not configured or text is empty.
        """
        if self._client is None:
            raise ValueError("OPENAI_API_KEY is not set")
        if not text or not text.strip():
            raise ValueError("Canonical text cannot be empty")

        response = await self._client.embeddings.create(
            input=text,
            model=self.settings.embedding_model,
            dimensions=self.settings.embedding_dimension,
        )
        return response.data[0].embedding
