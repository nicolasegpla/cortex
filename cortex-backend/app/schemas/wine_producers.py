"""Pydantic schemas for wine producer entities."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class WineProducerCreate(BaseModel):
    """Schema for creating a new wine producer."""

    nombre_comercial: str = Field(..., description="Commercial name")
    razon_social: str | None = Field(None, description="Legal business name")
    nit: str | None = Field(None, description="Tax ID number")
    direccion: str | None = Field(None, description="Street address")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    celular: str | None = Field(None, description="Phone number")
    correo: str | None = Field(None, description="Email address")
    marcas: list[str] | None = Field(None, description="Brands")
    fuente_azucar: str | None = Field(None, description="Sugar source")
    tipo_uva: list[str] | None = Field(None, description="Grape varieties")
    tipo_vino: list[str] | None = Field(None, description="Wine types")
    levaduras_utilizadas: list[str] | None = Field(None, description="Yeasts used")
    botellas_utilizadas: list[str] | None = Field(None, description="Bottles used")
    nutrientes_utilizados: list[str] | None = Field(None, description="Nutrients used")
    conservantes_utilizados: list[str] | None = Field(None, description="Preservatives used")
    clarificantes_utilizados: list[str] | None = Field(None, description="Clarifiers used")
    produccion_anual: str | None = Field(None, description="Annual production")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")


class WineProducerUpdate(BaseModel):
    """Schema for updating an existing wine producer."""

    nombre_comercial: str | None = Field(None, description="Commercial name")
    razon_social: str | None = Field(None, description="Legal business name")
    nit: str | None = Field(None, description="Tax ID number")
    direccion: str | None = Field(None, description="Street address")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    celular: str | None = Field(None, description="Phone number")
    correo: str | None = Field(None, description="Email address")
    marcas: list[str] | None = Field(None, description="Brands")
    fuente_azucar: str | None = Field(None, description="Sugar source")
    tipo_uva: list[str] | None = Field(None, description="Grape varieties")
    tipo_vino: list[str] | None = Field(None, description="Wine types")
    levaduras_utilizadas: list[str] | None = Field(None, description="Yeasts used")
    botellas_utilizadas: list[str] | None = Field(None, description="Bottles used")
    nutrientes_utilizados: list[str] | None = Field(None, description="Nutrients used")
    conservantes_utilizados: list[str] | None = Field(None, description="Preservatives used")
    clarificantes_utilizados: list[str] | None = Field(None, description="Clarifiers used")
    produccion_anual: str | None = Field(None, description="Annual production")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")


class WineProducerResponse(BaseModel):
    """Schema for wine producer API responses."""

    id: UUID = Field(..., description="Unique identifier")
    nombre_comercial: str = Field(..., description="Commercial name")
    razon_social: str | None = Field(None, description="Legal business name")
    nit: str | None = Field(None, description="Tax ID number")
    direccion: str | None = Field(None, description="Street address")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    celular: str | None = Field(None, description="Phone number")
    correo: str | None = Field(None, description="Email address")
    marcas: list[str] | None = Field(None, description="Brands")
    fuente_azucar: str | None = Field(None, description="Sugar source")
    tipo_uva: list[str] | None = Field(None, description="Grape varieties")
    tipo_vino: list[str] | None = Field(None, description="Wine types")
    levaduras_utilizadas: list[str] | None = Field(None, description="Yeasts used")
    botellas_utilizadas: list[str] | None = Field(None, description="Bottles used")
    nutrientes_utilizados: list[str] | None = Field(None, description="Nutrients used")
    conservantes_utilizados: list[str] | None = Field(None, description="Preservatives used")
    clarificantes_utilizados: list[str] | None = Field(None, description="Clarifiers used")
    produccion_anual: str | None = Field(None, description="Annual production")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = {"from_attributes": True}
