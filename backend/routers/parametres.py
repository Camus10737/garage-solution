from fastapi import APIRouter, Depends

from core.auth import verify_token
from core.firebase import get_db
from core.permissions import require_roles
from schemas.parametre import TAUX_HORAIRE_DEFAUT, ParametresOut, ParametresUpdate

router = APIRouter(prefix="/parametres", tags=["Paramètres"])


@router.get("", response_model=ParametresOut)
async def get_parametres(
    _user: dict = Depends(verify_token),
):
    db = get_db()
    doc = db.collection("parametres").document(_user["garage_id"]).get()
    if not doc.exists:
        return ParametresOut(taux_horaire_defaut=TAUX_HORAIRE_DEFAUT)
    data = doc.to_dict()
    return ParametresOut(
        taux_horaire_defaut=data.get("taux_horaire_defaut", TAUX_HORAIRE_DEFAUT),
        canaux_notification=data.get("canaux_notification", {}),
        horaires_ouverture=data.get("horaires_ouverture", {}),
        nombre_baies=data.get("nombre_baies", 1),
        duree_rdv_minutes=data.get("duree_rdv_minutes", 60),
        plages_bloquees=data.get("plages_bloquees", []),
    )


@router.put("", response_model=ParametresOut)
async def update_parametres(
    body: ParametresUpdate,
    _user: dict = Depends(require_roles("admin")),
):
    db = get_db()
    ref = db.collection("parametres").document(_user["garage_id"])
    ref.set(body.model_dump())
    return ParametresOut(**body.model_dump())
