from typing import List

from fastapi import APIRouter, Depends

from core.firebase import get_db
from core.permissions import require_roles
from schemas.rappel import EnvoyerRappelsBody, RappelDu
from services.rappel_service import calculer_rappels_dus, envoyer_rappel

router = APIRouter(prefix="/rappels-entretien", tags=["Rappels d'entretien"])


@router.get("/dus", response_model=List[RappelDu])
async def get_rappels_dus(
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    return calculer_rappels_dus(db, _user["garage_id"])


@router.post("/envoyer")
async def envoyer_rappels(
    body: EnvoyerRappelsBody,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    for r in body.rappels:
        envoyer_rappel(db, _user["garage_id"], r.vehicule_id, r.modele_id)
    return {"envoyes": len(body.rappels)}
