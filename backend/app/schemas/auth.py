from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    age: int
    gender: str
    email: EmailStr
    phone: str
    password: str
    confirm_password: str

    country: str
    state: str
    city: str
    area: str

    sports: dict[str, str]


class LoginRequest(BaseModel):
    username: str
    password: str