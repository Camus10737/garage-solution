from typing import List, Literal, Optional

from pydantic import BaseModel, Field

MethodeEnvoiPromo = Literal["sms", "email", "les_deux"]
StatutPromotion = Literal["brouillon", "envoyee", "annulee"]


class PromotionCreate(BaseModel):
    titre: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    date_debut: str
    date_fin: str
    cible_tous: bool = True
    client_ids: List[str] = []
    methode_envoi: MethodeEnvoiPromo = "sms"


class PromotionUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None
    cible_tous: Optional[bool] = None
    client_ids: Optional[List[str]] = None
    methode_envoi: Optional[MethodeEnvoiPromo] = None


class PromotionOut(BaseModel):
    promotion_id: str
    titre: str
    description: str
    date_debut: str
    date_fin: str
    cible_tous: bool
    client_ids: List[str] = []
    methode_envoi: MethodeEnvoiPromo
    statut: StatutPromotion
    date_envoi: Optional[str] = None
    date_creation: str
