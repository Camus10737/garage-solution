from typing import Optional

from pydantic import BaseModel, Field


class ClientCreate(BaseModel):
    nom: str = Field(..., min_length=1)
    telephone: str = Field(..., min_length=1)
    email: Optional[str] = None
    adresse: Optional[str] = None
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    nom: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    adresse: Optional[str] = None
    notes: Optional[str] = None


class ClientPatch(BaseModel):
    active: bool


class ClientOut(BaseModel):
    client_id: str
    nom: str
    telephone: str
    email: Optional[str] = None
    adresse: Optional[str] = None
    notes: Optional[str] = None
    active: bool
    date_creation: str
    # Champs legacy (anciens clients Firestore)
    vehicule: Optional[str] = None
    annee: Optional[str] = None
    taille_moteur: Optional[str] = None
    autre: Optional[str] = None
