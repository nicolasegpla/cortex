from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

ALLOWED_ROLES = ("operativo", "super_admin")


class CreateUserRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    role: str = "operativo"

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in ALLOWED_ROLES:
            raise ValueError(f"Rol no válido. Permitidos: {', '.join(ALLOWED_ROLES)}")
        return value


class UserResponse(BaseModel):
    id: str
    email: str
    role: str


class UserListResponse(BaseModel):
    users: list[UserResponse]
