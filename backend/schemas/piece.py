from typing import List, Optional

from pydantic import BaseModel, Field


class FournisseurPiece(BaseModel):
    fournisseur_id: str
    prix_achat: float = Field(..., ge=0)
    delai_livraison: Optional[str] = None


class PieceCreate(BaseModel):
    nom: str = Field(..., min_length=1)
    prix: float = Field(..., ge=0)
    quantite: Optional[int] = None
    fournie_par_client: bool = False
    numero_item: Optional[str] = None
    categorie: Optional[str] = None
    emplacement: Optional[str] = None
    seuil_alerte: Optional[int] = None
    fournisseurs: List[FournisseurPiece] = []


class PieceUpdate(BaseModel):
    nom: Optional[str] = None
    prix: Optional[float] = Field(None, ge=0)
    quantite: Optional[int] = None
    fournie_par_client: Optional[bool] = None
    numero_item: Optional[str] = None
    categorie: Optional[str] = None
    emplacement: Optional[str] = None
    seuil_alerte: Optional[int] = None
    fournisseurs: Optional[List[FournisseurPiece]] = None


class PiecePatch(BaseModel):
    active: bool


class PieceOut(BaseModel):
    piece_id: str
    nom: str
    prix: float
    active: bool
    quantite: Optional[int] = None
    fournie_par_client: bool
    numero_item: Optional[str] = None
    categorie: Optional[str] = None
    emplacement: Optional[str] = None
    seuil_alerte: Optional[int] = None
    fournisseurs: List[FournisseurPiece] = []
