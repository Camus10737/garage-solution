from typing import Optional

from pydantic import BaseModel, Field

ROLES = ("admin", "gestionnaire", "comptable")


class UserCreate(BaseModel):
    nom: str = Field(..., min_length=1)
    email: str
    telephone: Optional[str] = None
    password: str = Field(..., min_length=6)
    role: str


class UserUpdate(BaseModel):
    nom: Optional[str] = None
    telephone: Optional[str] = None
    role: Optional[str] = None
    actif: Optional[bool] = None


class UserOut(BaseModel):
    uid: str
    nom: str
    email: str
    telephone: Optional[str] = None
    garage_id: str
    role: str
    actif: bool
    date_creation: str


class MoiOut(BaseModel):
    uid: str
    garage_id: str
    garage_nom: str
    role: str
