from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class VehiculeCreate(BaseModel):
    client_id: str
    marque_modele: str = Field(..., min_length=1)
    annee: Optional[str] = None
    taille_moteur: Optional[str] = None
    plaque: Optional[str] = None
    notes: Optional[str] = None


class VehiculeUpdate(BaseModel):
    marque_modele: Optional[str] = None
    annee: Optional[str] = None
    taille_moteur: Optional[str] = None
    plaque: Optional[str] = None
    notes: Optional[str] = None


class VehiculeOut(BaseModel):
    vehicule_id: str
    client_id: str
    marque_modele: str
    annee: Optional[str] = None
    taille_moteur: Optional[str] = None
    plaque: Optional[str] = None
    notes: Optional[str] = None
    date_creation: str
