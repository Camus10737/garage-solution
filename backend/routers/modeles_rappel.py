from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.firebase import get_db
from core.permissions import require_roles
from core.tenant import verifier_appartenance
from schemas.rappel import (
    ModeleRappelCreate,
    ModeleRappelOut,
    ModeleRappelPatch,
    ModeleRappelUpdate,
)

router = APIRouter(prefix="/modeles-rappel", tags=["Rappels d'entretien"])


def _doc_to_modele(doc) -> ModeleRappelOut:
    data = doc.to_dict()
    data["modele_id"] = doc.id
    return ModeleRappelOut(**data)


@router.get("", response_model=List[ModeleRappelOut])
async def list_modeles(
    actif_only: bool = False,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    query = db.collection("modeles_rappel").where("garage_id", "==", _user["garage_id"])
    if actif_only:
        query = query.where("actif", "==", True)
    return [_doc_to_modele(d) for d in query.stream()]


@router.post("", response_model=ModeleRappelOut, status_code=status.HTTP_201_CREATED)
async def create_modele(
    body: ModeleRappelCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    data = body.model_dump()
    data["garage_id"] = _user["garage_id"]
    data["actif"] = True
    data["date_creation"] = datetime.now(timezone.utc).isoformat()

    ref = db.collection("modeles_rappel").document()
    ref.set(data)

    data["modele_id"] = ref.id
    return ModeleRappelOut(**data)


@router.put("/{modele_id}", response_model=ModeleRappelOut)
async def update_modele(
    modele_id: str,
    body: ModeleRappelUpdate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("modeles_rappel").document(modele_id)
    doc = ref.get()
    verifier_appartenance(doc, _user["garage_id"], "Modèle de rappel introuvable")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ref.update(updates)
    data = {**doc.to_dict(), **updates, "modele_id": modele_id}
    return ModeleRappelOut(**data)


@router.patch("/{modele_id}", response_model=ModeleRappelOut)
async def patch_modele(
    modele_id: str,
    body: ModeleRappelPatch,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("modeles_rappel").document(modele_id)
    doc = ref.get()
    verifier_appartenance(doc, _user["garage_id"], "Modèle de rappel introuvable")

    ref.update({"actif": body.actif})
    data = {**doc.to_dict(), "actif": body.actif, "modele_id": modele_id}
    return ModeleRappelOut(**data)
