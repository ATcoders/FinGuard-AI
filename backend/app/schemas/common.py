from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

RoleCode = Literal["employee", "manager", "finance", "director", "cfo", "admin"]


class RegisterIn(BaseModel):
    company_name: str = Field(min_length=2, max_length=200)
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if v.isalpha() or v.isdigit():
            raise ValueError("Password must mix letters with numbers or symbols")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class DepartmentIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=2, max_length=20)
    monthly_budget: Optional[Decimal] = Field(default=None, ge=0)
    spending_limit: Optional[Decimal] = Field(default=None, ge=0)
    is_active: bool = True


class DesignationIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    level_rank: int = Field(ge=1, le=20)
    approval_limit: Optional[Decimal] = Field(default=None, ge=0)


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: RoleCode
    employee_code: Optional[str] = Field(default=None, max_length=30)
    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    manager_id: Optional[int] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    role: Optional[RoleCode] = None
    employee_code: Optional[str] = Field(default=None, max_length=30)
    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=128)
