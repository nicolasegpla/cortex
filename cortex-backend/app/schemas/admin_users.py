from pydantic import BaseModel, EmailStr, field_validator, model_validator

ALLOWED_ROLES = ("operativo", "super_admin")


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    password_confirm: str
    role: str = "operativo"

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in ALLOWED_ROLES:
            raise ValueError(f"Rol no válido. Permitidos: {', '.join(ALLOWED_ROLES)}")
        return value

    @model_validator(mode="after")
    def check_passwords_match(self) -> "CreateUserRequest":
        if self.password != self.password_confirm:
            raise ValueError("La confirmación de contraseña no coincide")
        return self


class UserResponse(BaseModel):
    id: str
    email: str
    role: str


class UserListResponse(BaseModel):
    users: list[UserResponse]
