from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from schemas.vehicule import VehiculeOut

StatutReparation = Literal["en_attente", "en_attente_piece", "en_cours", "fini"]
MethodePaiement = Literal["comptant", "carte", "virement", "cheque"]
StatutPaiement = Literal["non_paye", "partiellement_paye", "paye"]


class LigneFacturePiece(BaseModel):
    piece_id: str
    nom: str
    prix: float
    quantite: int = Field(..., ge=1)
    fournie_par_client: bool = False


class LigneFactureService(BaseModel):
    service_id: str
    nom: str
    prix: float


class FactureCreate(BaseModel):
    client_id: str
    vehicule_id: str
    pieces: List[LigneFacturePiece] = []
    services: List[LigneFactureService] = []
    kilometrage: Optional[int] = None
    notes: Optional[str] = None


class FacturePatch(BaseModel):
    statut_reparation: StatutReparation


class MecanicienPatch(BaseModel):
    mecanicien_nom: Optional[str] = None


class HistoriqueStatut(BaseModel):
    statut: StatutReparation
    date: str


class PaiementCreate(BaseModel):
    montant: float = Field(..., gt=0)
    methode: MethodePaiement


class Paiement(BaseModel):
    montant: float
    methode: MethodePaiement
    date: str


class FactureAnnuler(BaseModel):
    raison: Optional[str] = None


class FactureOut(BaseModel):
    facture_id: str
    numero_facture: Optional[str] = None
    devis_id: Optional[str] = None
    client_id: str
    client_nom: Optional[str] = None
    vehicule_id: Optional[str] = None
    vehicule_info: Optional[VehiculeOut] = None
    pieces: List[LigneFacturePiece]
    services: List[LigneFactureService]
    total_pieces: float
    total_services: float
    taxes: float
    total_facture: float
    date_creation: str
    statut_reparation: StatutReparation
    historique_statuts: List[HistoriqueStatut] = []
    mecanicien_nom: Optional[str] = None
    statut_paiement: StatutPaiement = "non_paye"
    paiements: List[Paiement] = []
    montant_paye: float = 0
    solde_restant: float = 0
    annulee: bool = False
    raison_annulation: Optional[str] = None
    date_annulation: Optional[str] = None
    pdf_url: Optional[str] = None
    notes: Optional[str] = None
    # Champs legacy (anciennes factures sans vehicule_id)
    vehicule: Optional[str] = None
    annee: Optional[str] = None
    taille_moteur: Optional[str] = None
    autre: Optional[str] = None
