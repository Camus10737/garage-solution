from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from schemas.vehicule import VehiculeOut

StatutVehicule = Literal["en_cours", "pret"]


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
    notes: Optional[str] = None


class FacturePatch(BaseModel):
    statut_vehicule: StatutVehicule


class FactureOut(BaseModel):
    facture_id: str
    numero_facture: Optional[str] = None
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
    statut_vehicule: StatutVehicule
    pdf_url: Optional[str] = None
    notes: Optional[str] = None
    # Champs legacy (anciennes factures sans vehicule_id)
    vehicule: Optional[str] = None
    annee: Optional[str] = None
    taille_moteur: Optional[str] = None
    autre: Optional[str] = None
