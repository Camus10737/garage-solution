from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import verify_token
from core.firebase import get_db
from schemas.vehicule import VehiculeCreate, VehiculeOut, VehiculeUpdate

router = APIRouter(prefix="/vehicules", tags=["Véhicules"])


def _doc_to_vehicule(doc) -> VehiculeOut:
    data = doc.to_dict()
    data["vehicule_id"] = doc.id
    return VehiculeOut(**data)


@router.get("", response_model=List[VehiculeOut])
async def list_vehicules(
    client_id: str = "",
    _user: dict = Depends(verify_token),
):
    db = get_db()
    query = db.collection("vehicules")
    if client_id:
        query = query.where("client_id", "==", client_id)
    docs = list(query.stream())
    vehicules = [_doc_to_vehicule(d) for d in docs]
    vehicules.sort(key=lambda v: v.date_creation)
    return vehicules


@router.post("", response_model=VehiculeOut, status_code=status.HTTP_201_CREATED)
async def create_vehicule(
    body: VehiculeCreate,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    client_doc = db.collection("clients").document(body.client_id).get()
    if not client_doc.exists:
        raise HTTPException(status_code=404, detail="Client introuvable")

    data = body.model_dump()
    data["date_creation"] = datetime.now(timezone.utc).isoformat()

    ref = db.collection("vehicules").document()
    ref.set(data)
    data["vehicule_id"] = ref.id
    return VehiculeOut(**data)


@router.put("/{vehicule_id}", response_model=VehiculeOut)
async def update_vehicule(
    vehicule_id: str,
    body: VehiculeUpdate,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    ref = db.collection("vehicules").document(vehicule_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ref.update(updates)

    data = {**doc.to_dict(), **updates, "vehicule_id": vehicule_id}
    return VehiculeOut(**data)


@router.delete("/{vehicule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicule(
    vehicule_id: str,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    ref = db.collection("vehicules").document(vehicule_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")

    # Bloquer la suppression si des factures sont liées
    factures = (
        db.collection("factures")
        .where("vehicule_id", "==", vehicule_id)
        .limit(1)
        .stream()
    )
    if any(True for _ in factures):
        raise HTTPException(
            status_code=400,
            detail="Impossible de supprimer : des factures sont associées à ce véhicule.",
        )

    ref.delete()
