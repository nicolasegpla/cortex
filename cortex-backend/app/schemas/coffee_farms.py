"""Pydantic schemas for coffee farm entities."""

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

ActivityType = Literal["Productor", "Cooperativa", "Asociacion", "Exportador", "Tostador"]
ProcessType = Literal["Lavado", "Natural", "Honey", "Anaerobico", "Maceracion carbonica"]
TechnificationLevel = Literal["Manual", "Semi automatizado", "Tecnificado"]


class CoffeeFarmCreate(BaseModel):
    """Schema for creating a new coffee farm."""

    nombre_finca: str = Field(..., description="Farm name")
    razon_social: str | None = Field(None, description="Legal business name")
    nit: str | None = Field(None, description="Tax ID number")
    marca: str | None = Field(None, description="Brand or trademark")
    direccion: str | None = Field(None, description="Street address")
    departamento: str | None = Field(None, description="Department")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    phones: list[str] = Field(default_factory=list, description="Contact phone numbers in order")
    correo: str | None = Field(None, description="Email address")
    tipo_actividad: ActivityType | None = Field(None, description="Activity type")
    hectareas_totales: Decimal | None = Field(None, description="Total hectares")
    hectareas_cafe: Decimal | None = Field(None, description="Coffee hectares")
    numero_arboles: int | None = Field(None, description="Number of trees")
    variedades_sembradas: list[str] | None = Field(None, description="Planted varieties")
    tipo_proceso: ProcessType | None = Field(None, description="Process type")
    puntaje_cafe: Decimal | None = Field(None, description="Coffee score")
    nivel_tecnificacion: TechnificationLevel | None = Field(
        None, description="Technification level"
    )
    equipos: list[str] | None = Field(None, description="Equipment list")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")


class CoffeeFarmUpdate(BaseModel):
    """Schema for updating an existing coffee farm."""

    nombre_finca: str | None = Field(None, description="Farm name")
    razon_social: str | None = Field(None, description="Legal business name")
    nit: str | None = Field(None, description="Tax ID number")
    marca: str | None = Field(None, description="Brand or trademark")
    direccion: str | None = Field(None, description="Street address")
    departamento: str | None = Field(None, description="Department")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    phones: list[str] = Field(default_factory=list, description="Contact phone numbers in order")
    correo: str | None = Field(None, description="Email address")
    tipo_actividad: ActivityType | None = Field(None, description="Activity type")
    hectareas_totales: Decimal | None = Field(None, description="Total hectares")
    hectareas_cafe: Decimal | None = Field(None, description="Coffee hectares")
    numero_arboles: int | None = Field(None, description="Number of trees")
    variedades_sembradas: list[str] | None = Field(None, description="Planted varieties")
    tipo_proceso: ProcessType | None = Field(None, description="Process type")
    puntaje_cafe: Decimal | None = Field(None, description="Coffee score")
    nivel_tecnificacion: TechnificationLevel | None = Field(
        None, description="Technification level"
    )
    equipos: list[str] | None = Field(None, description="Equipment list")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")


class CoffeeFarmResponse(BaseModel):
    """Schema for coffee farm API responses."""

    id: UUID = Field(..., description="Unique identifier")
    nombre_finca: str = Field(..., description="Farm name")
    razon_social: str | None = Field(None, description="Legal business name")
    nit: str | None = Field(None, description="Tax ID number")
    marca: str | None = Field(None, description="Brand or trademark")
    direccion: str | None = Field(None, description="Street address")
    departamento: str | None = Field(None, description="Department")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    phones: list[str] = Field(default_factory=list, description="Contact phone numbers in order")
    correo: str | None = Field(None, description="Email address")
    tipo_actividad: ActivityType | None = Field(None, description="Activity type")
    hectareas_totales: Decimal | None = Field(None, description="Total hectares")
    hectareas_cafe: Decimal | None = Field(None, description="Coffee hectares")
    numero_arboles: int | None = Field(None, description="Number of trees")
    variedades_sembradas: list[str] | None = Field(None, description="Planted varieties")
    tipo_proceso: ProcessType | None = Field(None, description="Process type")
    puntaje_cafe: Decimal | None = Field(None, description="Coffee score")
    nivel_tecnificacion: TechnificationLevel | None = Field(
        None, description="Technification level"
    )
    equipos: list[str] | None = Field(None, description="Equipment list")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = {"from_attributes": True}
