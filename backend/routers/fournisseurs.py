from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.firebase import get_db
from core.permissions import require_roles
from core.tenant import verifier_appartenance
from routers.commandes_fournisseur import _enrich_commande
from schemas.commande_fournisseur import CommandeFournisseurOut
from schemas.fournisseur import (
    FournisseurCreate,
    FournisseurOut,
    FournisseurPatch,
    FournisseurUpdate,
)

router = APIRouter(prefix="/fournisseurs", tags=["Fournisseurs"])


def _doc_to_fournisseur(doc) -> FournisseurOut:
    data = doc.to_dict()
    data["fournisseur_id"] = doc.id
    return FournisseurOut(**data)


@router.get("", response_model=List[FournisseurOut])
async def list_fournisseurs(
    search: str = "",
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    docs = db.collection("fournisseurs").where("garage_id", "==", _user["garage_id"]).stream()
    fournisseurs = [_doc_to_fournisseur(d) for d in docs]

    if search:
        s = search.lower()
        fournisseurs = [f for f in fournisseurs if s in f.nom.lower()]

    return fournisseurs


@router.post("", response_model=FournisseurOut, status_code=status.HTTP_201_CREATED)
async def create_fournisseur(
    body: FournisseurCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    data = body.model_dump()
    data["garage_id"] = _user["garage_id"]
    data["active"] = True
    data["date_creation"] = datetime.now(timezone.utc).isoformat()

    ref = db.collection("fournisseurs").document()
    ref.set(data)

    data["fournisseur_id"] = ref.id
    return FournisseurOut(**data)


@router.get("/{fournisseur_id}", response_model=FournisseurOut)
async def get_fournisseur(
    fournisseur_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    doc = db.collection("fournisseurs").document(fournisseur_id).get()
    verifier_appartenance(doc, _user["garage_id"], "Fournisseur introuvable")
    return _doc_to_fournisseur(doc)


@router.put("/{fournisseur_id}", response_model=FournisseurOut)
async def update_fournisseur(
    fournisseur_id: str,
    body: FournisseurUpdate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("fournisseurs").document(fournisseur_id)
    doc = ref.get()
    verifier_appartenance(doc, _user["garage_id"], "Fournisseur introuvable")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ref.update(updates)

    data = {**doc.to_dict(), **updates, "fournisseur_id": fournisseur_id}
    return FournisseurOut(**data)


@router.patch("/{fournisseur_id}", response_model=FournisseurOut)
async def patch_fournisseur(
    fournisseur_id: str,
    body: FournisseurPatch,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("fournisseurs").document(fournisseur_id)
    doc = ref.get()
    verifier_appartenance(doc, _user["garage_id"], "Fournisseur introuvable")

    ref.update({"active": body.active})
    data = {**doc.to_dict(), "active": body.active, "fournisseur_id": fournisseur_id}
    return FournisseurOut(**data)


@router.get("/{fournisseur_id}/commandes", response_model=List[CommandeFournisseurOut])
async def get_fournisseur_commandes(
    fournisseur_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    fournisseur_doc = db.collection("fournisseurs").document(fournisseur_id).get()
    fournisseur_data = verifier_appartenance(fournisseur_doc, _user["garage_id"], "Fournisseur introuvable")
    fournisseur_nom = fournisseur_data.get("nom", "")

    docs = (
        db.collection("commandes_fournisseur")
        .where("garage_id", "==", _user["garage_id"])
        .where("fournisseur_id", "==", fournisseur_id)
        .order_by("date_commande", direction="DESCENDING")
        .stream()
    )
    commandes = []
    for doc in docs:
        data = doc.to_dict()
        data["commande_id"] = doc.id
        commandes.append(_enrich_commande(data, fournisseur_nom))
    return commandes
