from typing import Literal, Optional

from pydantic import BaseModel, Field

TypeDeclencheur = Literal["km", "date", "les_deux"]


class ModeleRappelCreate(BaseModel):
    nom: str = Field(..., min_length=1)
    type_declencheur: TypeDeclencheur
    valeur_km: Optional[int] = None
    valeur_mois: Optional[int] = None
    message: str = Field(..., min_length=1)
    promotion_id: Optional[str] = None


class ModeleRappelUpdate(BaseModel):
    nom: Optional[str] = None
    type_declencheur: Optional[TypeDeclencheur] = None
    valeur_km: Optional[int] = None
    valeur_mois: Optional[int] = None
    message: Optional[str] = None
    promotion_id: Optional[str] = None


class ModeleRappelPatch(BaseModel):
    actif: bool


class ModeleRappelOut(BaseModel):
    modele_id: str
    nom: str
    type_declencheur: TypeDeclencheur
    valeur_km: Optional[int] = None
    valeur_mois: Optional[int] = None
    message: str
    promotion_id: Optional[str] = None
    actif: bool
    date_creation: str


class RappelDu(BaseModel):
    vehicule_id: str
    vehicule_label: str
    client_id: str
    client_nom: str
    client_telephone: str
    modele_id: str
    modele_nom: str
    raison: str


class RappelAEnvoyer(BaseModel):
    vehicule_id: str
    modele_id: str


class EnvoyerRappelsBody(BaseModel):
    rappels: list[RappelAEnvoyer]
