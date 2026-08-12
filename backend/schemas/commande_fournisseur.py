from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from schemas.facture import MethodePaiement, Paiement, StatutPaiement

StatutCommandeFournisseur = Literal["commandee", "partiellement_recue", "recue"]


class LigneCommandeFournisseur(BaseModel):
    piece_id: str
    nom: str
    quantite_commandee: int = Field(..., ge=1)
    quantite_recue: int = 0
    prix_achat: float = Field(..., ge=0)


class CommandeFournisseurCreate(BaseModel):
    fournisseur_id: str
    lignes: List[LigneCommandeFournisseur]
    commande_speciale_id: Optional[str] = None
    notes: Optional[str] = None


class LigneReception(BaseModel):
    piece_id: str
    quantite: int = Field(..., ge=1)


class ReceptionCreate(BaseModel):
    lignes: List[LigneReception]


class PaiementFournisseurCreate(BaseModel):
    montant: float = Field(..., gt=0)
    methode: MethodePaiement


class CommandeFournisseurOut(BaseModel):
    commande_id: str
    numero_commande: Optional[str] = None
    fournisseur_id: str
    fournisseur_nom: Optional[str] = None
    lignes: List[LigneCommandeFournisseur]
    montant_total: float
    paiements: List[Paiement] = []
    montant_paye: float = 0
    solde_restant: float = 0
    statut_paiement: StatutPaiement = "non_paye"
    statut: StatutCommandeFournisseur
    commande_speciale_id: Optional[str] = None
    notes: Optional[str] = None
    date_commande: str
    date_derniere_reception: Optional[str] = None
