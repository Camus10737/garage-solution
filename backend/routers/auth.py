from fastapi import APIRouter, Depends

from core.auth import verify_token
from core.firebase import get_db
from schemas.user import MoiOut

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/moi", response_model=MoiOut)
async def moi(_user: dict = Depends(verify_token)):
    db = get_db()
    garage_doc = db.collection("garages").document(_user["garage_id"]).get()
    garage_nom = garage_doc.to_dict().get("nom", "") if garage_doc.exists else ""

    return MoiOut(
        uid=_user["uid"],
        garage_id=_user["garage_id"],
        garage_nom=garage_nom,
        role=_user["role"],
    )
