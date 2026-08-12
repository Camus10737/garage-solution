from typing import Literal, Optional

from pydantic import BaseModel

TypeMouvement = Literal["entree", "sortie"]
SourceMouvement = Literal["reception_fournisseur", "facture", "commande_speciale"]


class MouvementStockOut(BaseModel):
    mouvement_id: str
    piece_id: str
    type: TypeMouvement
    quantite: int
    source: SourceMouvement
    reference_id: Optional[str] = None
    date: str
