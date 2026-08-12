from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.firebase import get_db
from core.permissions import require_roles
from core.tenant import verifier_appartenance
from schemas.promotion import PromotionCreate, PromotionOut, PromotionUpdate
from services.notification_service import envoyer_notification_promotion

router = APIRouter(prefix="/promotions", tags=["Promotions"])


def _doc_to_promotion(doc) -> PromotionOut:
    data = doc.to_dict()
    data["promotion_id"] = doc.id
    return PromotionOut(**data)


@router.get("", response_model=List[PromotionOut])
async def list_promotions(
    statut: str = "",
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    query = (
        db.collection("promotions")
        .where("garage_id", "==", _user["garage_id"])
        .order_by("date_creation", direction="DESCENDING")
    )
    if statut in ("brouillon", "envoyee", "annulee"):
        query = query.where("statut", "==", statut)
    return [_doc_to_promotion(d) for d in query.stream()]


@router.post("", response_model=PromotionOut, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    body: PromotionCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    data = {
        **body.model_dump(),
        "garage_id": _user["garage_id"],
        "statut": "brouillon",
        "date_envoi": None,
        "date_creation": datetime.now(timezone.utc).isoformat(),
    }
    ref = db.collection("promotions").document()
    ref.set(data)
    data["promotion_id"] = ref.id
    return PromotionOut(**data)


@router.get("/{promotion_id}", response_model=PromotionOut)
async def get_promotion(
    promotion_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    doc = db.collection("promotions").document(promotion_id).get()
    verifier_appartenance(doc, _user["garage_id"], "Promotion introuvable")
    return _doc_to_promotion(doc)


@router.put("/{promotion_id}", response_model=PromotionOut)
async def update_promotion(
    promotion_id: str,
    body: PromotionUpdate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("promotions").document(promotion_id)
    doc = ref.get()
    verifier_appartenance(doc, _user["garage_id"], "Promotion introuvable")
    if doc.to_dict().get("statut") != "brouillon":
        raise HTTPException(status_code=400, detail="Seule une promotion en brouillon peut être modifiée")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ref.update(updates)
    data = {**doc.to_dict(), **updates, "promotion_id": promotion_id}
    return PromotionOut(**data)


@router.post("/{promotion_id}/envoyer", response_model=PromotionOut)
async def envoyer_promotion(
    promotion_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("promotions").document(promotion_id)
    doc = ref.get()
    data = verifier_appartenance(doc, _user["garage_id"], "Promotion introuvable")
    if data.get("statut") != "brouillon":
        raise HTTPException(status_code=400, detail="Cette promotion a déjà été envoyée ou annulée")

    if data.get("cible_tous"):
        clients = [
            c.to_dict() | {"client_id": c.id}
            for c in db.collection("clients")
            .where("garage_id", "==", _user["garage_id"])
            .where("active", "==", True)
            .stream()
        ]
    else:
        client_ids = data.get("client_ids", [])
        clients = []
        if client_ids:
            for cdoc in db.get_all([db.collection("clients").document(cid) for cid in client_ids]):
                if cdoc.exists:
                    clients.append(cdoc.to_dict() | {"client_id": cdoc.id})

    for client in clients:
        try:
            envoyer_notification_promotion(
                db=db,
                garage_id=_user["garage_id"],
                promotion_id=promotion_id,
                client_id=client["client_id"],
                client_nom=client.get("nom", ""),
                client_telephone=client.get("telephone", ""),
                client_email=client.get("email"),
                titre=data.get("titre", ""),
                description=data.get("description", ""),
                methode_envoi=data.get("methode_envoi", "sms"),
            )
        except Exception:
            pass

    date_envoi = datetime.now(timezone.utc).isoformat()
    ref.update({"statut": "envoyee", "date_envoi": date_envoi})
    result = {**data, "statut": "envoyee", "date_envoi": date_envoi, "promotion_id": promotion_id}
    return PromotionOut(**result)


@router.post("/{promotion_id}/annuler", response_model=PromotionOut)
async def annuler_promotion(
    promotion_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("promotions").document(promotion_id)
    doc = ref.get()
    verifier_appartenance(doc, _user["garage_id"], "Promotion introuvable")
    if doc.to_dict().get("statut") != "brouillon":
        raise HTTPException(status_code=400, detail="Seule une promotion en brouillon peut être annulée")

    ref.update({"statut": "annulee"})
    data = {**doc.to_dict(), "statut": "annulee", "promotion_id": promotion_id}
    return PromotionOut(**data)
