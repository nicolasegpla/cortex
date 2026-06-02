from pydantic import BaseModel


class EntityCreate(BaseModel):
    name: str
    description: str | None = None


class EntityUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class EntityResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
