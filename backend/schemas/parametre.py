from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

TAUX_HORAIRE_DEFAUT = 95.0

CanalNotification = Literal["sms", "email", "les_deux"]
TypeNotificationAuto = Literal[
    "statut_reparation", "piece_recue", "rappel_paiement", "rappel_entretien",
    "rdv_confirme", "rdv_rappel",
]


class HoraireJour(BaseModel):
    ouvert: bool = False
    heure_debut: Optional[str] = None  # "HH:MM"
    heure_fin: Optional[str] = None


class PlageBloquee(BaseModel):
    date_debut: str
    date_fin: str
    raison: Optional[str] = None


class ParametresOut(BaseModel):
    taux_horaire_defaut: float
    canaux_notification: Dict[str, CanalNotification] = {}
    horaires_ouverture: Dict[str, HoraireJour] = {}
    nombre_baies: int = 1
    duree_rdv_minutes: int = 60
    plages_bloquees: List[PlageBloquee] = []


class ParametresUpdate(BaseModel):
    taux_horaire_defaut: float = Field(..., ge=0)
    canaux_notification: Dict[str, CanalNotification] = {}
    horaires_ouverture: Dict[str, HoraireJour] = {}
    nombre_baies: int = Field(1, ge=1)
    duree_rdv_minutes: int = Field(60, ge=5)
    plages_bloquees: List[PlageBloquee] = []
