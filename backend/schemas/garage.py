from typing import Optional

from pydantic import BaseModel, Field


class GarageCreate(BaseModel):
    nom_utilisateur: str = Field(..., min_length=1)
    nom_garage: str = Field(..., min_length=1)


class GarageUpdate(BaseModel):
    nom: Optional[str] = None
    adresse: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    province: Optional[str] = None


class GarageOut(BaseModel):
    garage_id: str
    nom: str
    adresse: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    province: Optional[str] = None
    logo_url: Optional[str] = None
    numero_tps: Optional[str] = None
    numero_tvq: Optional[str] = None
    date_creation: str


class GaragePublicOut(BaseModel):
    nom: str
    adresse: Optional[str] = None
    telephone: Optional[str] = None
    logo_url: Optional[str] = None
