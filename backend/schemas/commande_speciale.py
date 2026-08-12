from typing import Literal, Optional

from pydantic import BaseModel, Field

StatutCommandeSpeciale = Literal["commandee", "en_transit", "recue"]


class CommandeSpecialeCreate(BaseModel):
    client_id: str
    vehicule_id: str
    devis_id: Optional[str] = None
    piece_id: str
    piece_nom: str
    quantite: int = Field(..., ge=1)
    fournisseur_id: str
    prix_achat: float = Field(..., ge=0)
    notes: Optional[str] = None


class CommandeSpecialePatch(BaseModel):
    statut: StatutCommandeSpeciale


class CommandeSpecialeOut(BaseModel):
    commande_speciale_id: str
    client_id: str
    client_nom: Optional[str] = None
    vehicule_id: str
    devis_id: Optional[str] = None
    piece_id: str
    piece_nom: str
    quantite: int
    fournisseur_id: str
    fournisseur_nom: Optional[str] = None
    prix_achat: float
    statut: StatutCommandeSpeciale
    notes: Optional[str] = None
    date_commande: str
    date_reception: Optional[str] = None
