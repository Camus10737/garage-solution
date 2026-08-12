from typing import Literal, Optional

from pydantic import BaseModel, Field

StatutRendezVous = Literal["confirme", "complete", "annule"]


class RendezVousCreate(BaseModel):
    """Corps de l'endpoint public POST /rendez-vous."""
    client_nom: str = Field(..., min_length=1)
    client_telephone: str = Field(..., min_length=1)
    client_email: Optional[str] = None
    vehicule_marque_modele: str = Field(..., min_length=1)
    vehicule_annee: Optional[str] = None
    type_service: str = Field(..., min_length=1)
    description: Optional[str] = None
    date_heure: str


class RendezVousPatch(BaseModel):
    statut: StatutRendezVous


class RendezVousReprogrammer(BaseModel):
    date_heure: str


class RendezVousOut(BaseModel):
    rendez_vous_id: str
    client_id: str
    client_nom: str
    client_telephone: str
    client_email: Optional[str] = None
    vehicule_id: str
    vehicule_marque_modele: str
    vehicule_annee: Optional[str] = None
    type_service: str
    description: Optional[str] = None
    date_heure: str
    statut: StatutRendezVous
    rappel_envoye: bool = False
    date_creation: str


class CreneauDisponible(BaseModel):
    date_heure: str
