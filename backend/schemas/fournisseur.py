from typing import Optional

from pydantic import BaseModel, Field


class FournisseurCreate(BaseModel):
    nom: str = Field(..., min_length=1)
    telephone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class FournisseurUpdate(BaseModel):
    nom: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class FournisseurPatch(BaseModel):
    active: bool


class FournisseurOut(BaseModel):
    fournisseur_id: str
    nom: str
    telephone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    active: bool
    date_creation: str
