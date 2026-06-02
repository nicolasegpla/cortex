"""Pydantic schemas for brewery entities."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class BreweryCreate(BaseModel):
    """Schema for creating a new brewery."""

    nombre_cerveceria: str = Field(..., description="Name of the brewery")
    razon_social: str | None = Field(None, description="Legal business name")
    nit: str | None = Field(None, description="Tax ID number")
    direccion: str | None = Field(None, description="Street address")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    nombre_cervecero: str | None = Field(None, description="Brewer name")
    celular_1: str | None = Field(None, description="Primary phone number")
    celular_2: str | None = Field(None, description="Secondary phone number")
    correo: str | None = Field(None, description="Email address")
    maltas_utilizadas: list[str] | None = Field(None, description="Malts used")
    lupulos_utilizados: list[str] | None = Field(None, description="Hops used")
    levaduras_utilizadas: list[str] | None = Field(None, description="Yeasts used")
    utiliza_otros_productos: bool | None = Field(False, description="Uses other products")
    estilos_cerveza: list[str] | None = Field(None, description="Beer styles produced")
    tipo_operacion: Literal["maquila", "planta_propia", "ambos"] | None = Field(
        None, description="Operation type"
    )
    marca_equipo: str | None = Field(None, description="Equipment brand")
    capacidad_brewhouse: str | None = Field(None, description="Brewhouse capacity")
    capacidad_fermentacion: str | None = Field(None, description="Fermentation capacity")
    litros_mes: int | None = Field(None, description="Monthly production in liters")
    calidad_equipo: str | None = Field(None, description="Equipment quality")
    formatos_venta: list[str] | None = Field(None, description="Sales formats")
    donde_vende: str | None = Field(None, description="Where they sell")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")


class BreweryUpdate(BaseModel):
    """Schema for updating an existing brewery (all fields optional)."""

    nombre_cerveceria: str | None = Field(None, description="Name of the brewery")
    razon_social: str | None = Field(None, description="Legal business name")
    nit: str | None = Field(None, description="Tax ID number")
    direccion: str | None = Field(None, description="Street address")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    nombre_cervecero: str | None = Field(None, description="Brewer name")
    celular_1: str | None = Field(None, description="Primary phone number")
    celular_2: str | None = Field(None, description="Secondary phone number")
    correo: str | None = Field(None, description="Email address")
    maltas_utilizadas: list[str] | None = Field(None, description="Malts used")
    lupulos_utilizados: list[str] | None = Field(None, description="Hops used")
    levaduras_utilizadas: list[str] | None = Field(None, description="Yeasts used")
    utiliza_otros_productos: bool | None = Field(None, description="Uses other products")
    estilos_cerveza: list[str] | None = Field(None, description="Beer styles produced")
    tipo_operacion: Literal["maquila", "planta_propia", "ambos"] | None = Field(
        None, description="Operation type"
    )
    marca_equipo: str | None = Field(None, description="Equipment brand")
    capacidad_brewhouse: str | None = Field(None, description="Brewhouse capacity")
    capacidad_fermentacion: str | None = Field(None, description="Fermentation capacity")
    litros_mes: int | None = Field(None, description="Monthly production in liters")
    calidad_equipo: str | None = Field(None, description="Equipment quality")
    formatos_venta: list[str] | None = Field(None, description="Sales formats")
    donde_vende: str | None = Field(None, description="Where they sell")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")


class BreweryResponse(BaseModel):
    """Schema for brewery API responses."""

    id: UUID = Field(..., description="Unique identifier")
    nombre_cerveceria: str = Field(..., description="Name of the brewery")
    razon_social: str | None = Field(None, description="Legal business name")
    nit: str | None = Field(None, description="Tax ID number")
    direccion: str | None = Field(None, description="Street address")
    ciudad: str | None = Field(None, description="City")
    pais: str | None = Field(None, description="Country")
    nombre_contacto: str | None = Field(None, description="Contact person name")
    nombre_cervecero: str | None = Field(None, description="Brewer name")
    celular_1: str | None = Field(None, description="Primary phone number")
    celular_2: str | None = Field(None, description="Secondary phone number")
    correo: str | None = Field(None, description="Email address")
    maltas_utilizadas: list[str] | None = Field(None, description="Malts used")
    lupulos_utilizados: list[str] | None = Field(None, description="Hops used")
    levaduras_utilizadas: list[str] | None = Field(None, description="Yeasts used")
    utiliza_otros_productos: bool | None = Field(False, description="Uses other products")
    estilos_cerveza: list[str] | None = Field(None, description="Beer styles produced")
    tipo_operacion: str | None = Field(None, description="Operation type")
    marca_equipo: str | None = Field(None, description="Equipment brand")
    capacidad_brewhouse: str | None = Field(None, description="Brewhouse capacity")
    capacidad_fermentacion: str | None = Field(None, description="Fermentation capacity")
    litros_mes: int | None = Field(None, description="Monthly production in liters")
    calidad_equipo: str | None = Field(None, description="Equipment quality")
    formatos_venta: list[str] | None = Field(None, description="Sales formats")
    donde_vende: str | None = Field(None, description="Where they sell")
    observaciones: str | None = Field(None, description="Observations")
    oportunidades: str | None = Field(None, description="Opportunities")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = {"from_attributes": True}
