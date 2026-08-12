from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.firebase import get_db
from core.permissions import require_roles
from core.tenant import verifier_appartenance
from schemas.rendez_vous import (
    CreneauDisponible,
    RendezVousCreate,
    RendezVousOut,
    RendezVousPatch,
    RendezVousReprogrammer,
)
from services.rendez_vous_service import calculer_creneaux_disponibles, creer_rendez_vous

router = APIRouter(prefix="/rendez-vous", tags=["Rendez-vous"])


def _doc_to_rdv(doc) -> RendezVousOut:
    data = doc.to_dict()
    data["rendez_vous_id"] = doc.id
    return RendezVousOut(**data)


# ── Endpoints publics (aucune authentification — page de réservation en ligne) ────────────────────

@router.get("/creneaux-disponibles", response_model=List[CreneauDisponible])
async def get_creneaux_disponibles(garage_id: str, date_debut: str, date_fin: str):
    db = get_db()
    return calculer_creneaux_disponibles(db, garage_id, date_debut, date_fin)


@router.post("", response_model=RendezVousOut, status_code=status.HTTP_201_CREATED)
async def creer_rendez_vous_public(garage_id: str, body: RendezVousCreate):
    db = get_db()
    try:
        data = creer_rendez_vous(db, garage_id, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return RendezVousOut(**data)


# ── Endpoints authentifiés (gestion côté garage) ───────────────────────────────────────────────────

@router.get("", response_model=List[RendezVousOut])
async def list_rendez_vous(
    statut: str = "",
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    query = db.collection("rendez_vous").where("garage_id", "==", _user["garage_id"]).order_by("date_heure")
    if statut in ("confirme", "complete", "annule"):
        query = query.where("statut", "==", statut)
    return [_doc_to_rdv(d) for d in query.stream()]


@router.patch("/{rendez_vous_id}", response_model=RendezVousOut)
async def patch_rendez_vous(
    rendez_vous_id: str,
    body: RendezVousPatch,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("rendez_vous").document(rendez_vous_id)
    doc = ref.get()
    verifier_appartenance(doc, _user["garage_id"], "Rendez-vous introuvable")

    ref.update({"statut": body.statut})
    data = {**doc.to_dict(), "statut": body.statut, "rendez_vous_id": rendez_vous_id}
    return RendezVousOut(**data)


@router.post("/{rendez_vous_id}/reprogrammer", response_model=RendezVousOut)
async def reprogrammer_rendez_vous(
    rendez_vous_id: str,
    body: RendezVousReprogrammer,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("rendez_vous").document(rendez_vous_id)
    doc = ref.get()
    data = verifier_appartenance(doc, _user["garage_id"], "Rendez-vous introuvable")
    if data.get("statut") != "confirme":
        raise HTTPException(status_code=400, detail="Seul un rendez-vous confirmé peut être reprogrammé")

    try:
        datetime.fromisoformat(body.date_heure)
    except ValueError:
        raise HTTPException(status_code=400, detail="Date/heure invalide")

    ref.update({"date_heure": body.date_heure, "rappel_envoye": False})
    result = {**data, "date_heure": body.date_heure, "rappel_envoye": False, "rendez_vous_id": rendez_vous_id}
    return RendezVousOut(**result)
