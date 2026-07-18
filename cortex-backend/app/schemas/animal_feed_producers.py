"""Pydantic schemas for animal feed producer entities."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AnimalFeedProducerCreate(BaseModel):
    """Schema for creating a new animal feed producer."""

    razon_social: str = Field(..., description="Legal business name")
    marca: str | None = Field(None, description="Brand name")
    nit: str | None = Field(None, description="Tax ID number")
    direccion: str | None = Field(None, description="Street address")
    departamento: str | None = Field(None, description="Department")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    phones: list[str] = Field(default_factory=list, description="Contact phone numbers in order")
    correo: str | None = Field(None, description="Email address")
    especies_manejadas: list[str] | None = Field(None, description="Managed species")
    productos_fabricados: list[str] | None = Field(None, description="Manufactured products")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")


class AnimalFeedProducerUpdate(BaseModel):
    """Schema for updating an existing animal feed producer."""

    razon_social: str | None = Field(None, description="Legal business name")
    marca: str | None = Field(None, description="Brand name")
    nit: str | None = Field(None, description="Tax ID number")
    direccion: str | None = Field(None, description="Street address")
    departamento: str | None = Field(None, description="Department")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    phones: list[str] = Field(default_factory=list, description="Contact phone numbers in order")
    correo: str | None = Field(None, description="Email address")
    especies_manejadas: list[str] | None = Field(None, description="Managed species")
    productos_fabricados: list[str] | None = Field(None, description="Manufactured products")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")


class AnimalFeedProducerResponse(BaseModel):
    """Schema for animal feed producer API responses."""

    id: UUID = Field(..., description="Unique identifier")
    razon_social: str = Field(..., description="Legal business name")
    marca: str | None = Field(None, description="Brand name")
    nit: str | None = Field(None, description="Tax ID number")
    direccion: str | None = Field(None, description="Street address")
    departamento: str | None = Field(None, description="Department")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    phones: list[str] = Field(default_factory=list, description="Contact phone numbers in order")
    correo: str | None = Field(None, description="Email address")
    especies_manejadas: list[str] | None = Field(None, description="Managed species")
    productos_fabricados: list[str] | None = Field(None, description="Manufactured products")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = {"from_attributes": True}
