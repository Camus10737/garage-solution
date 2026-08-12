from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from schemas.vehicule import VehiculeOut

StatutDevis = Literal["brouillon", "en_attente", "accepte", "refuse"]


class LigneDevisPiece(BaseModel):
    piece_id: str
    nom: str
    prix: float
    quantite: int = Field(..., ge=1)
    fournie_par_client: bool = False


class LigneDevisService(BaseModel):
    service_id: str
    nom: str
    prix: float


class LigneDevisMainOeuvre(BaseModel):
    description: str
    heures: float = Field(..., gt=0)
    taux_horaire: float = Field(..., ge=0)


class DevisCreate(BaseModel):
    client_id: str
    vehicule_id: str
    pieces: List[LigneDevisPiece] = []
    services: List[LigneDevisService] = []
    main_oeuvre: List[LigneDevisMainOeuvre] = []
    notes: Optional[str] = None


class DevisPatch(BaseModel):
    statut: StatutDevis


class DevisOut(BaseModel):
    devis_id: str
    numero_devis: Optional[str] = None
    client_id: str
    client_nom: Optional[str] = None
    vehicule_id: Optional[str] = None
    vehicule_info: Optional[VehiculeOut] = None
    pieces: List[LigneDevisPiece]
    services: List[LigneDevisService]
    main_oeuvre: List[LigneDevisMainOeuvre]
    total_pieces: float
    total_services: float
    total_main_oeuvre: float
    taxes: float
    total_devis: float
    date_creation: str
    statut: StatutDevis
    converti: bool = False
    facture_id: Optional[str] = None
    pdf_url: Optional[str] = None
    notes: Optional[str] = None
