from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CredentialCreate(BaseModel):
    provider: str
    api_key: str
    label: str | None = None


class CredentialResponse(BaseModel):
    model_config = ConfigDict(extra='forbid')

    id: str
    provider: str
    label: str | None = None
    validated_at: datetime | None = None
