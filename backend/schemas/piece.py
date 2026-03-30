from typing import Optional

from pydantic import BaseModel, Field


class PieceCreate(BaseModel):
    nom: str = Field(..., min_length=1)
    prix: float = Field(..., ge=0)
    quantite: Optional[int] = None
    fournie_par_client: bool = False


class PieceUpdate(BaseModel):
    nom: Optional[str] = None
    prix: Optional[float] = Field(None, ge=0)
    quantite: Optional[int] = None
    fournie_par_client: Optional[bool] = None


class PiecePatch(BaseModel):
    active: bool


class PieceOut(BaseModel):
    piece_id: str
    nom: str
    prix: float
    active: bool
    quantite: Optional[int] = None
    fournie_par_client: bool
