from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import verify_token
from core.firebase import get_db
from schemas.client import ClientCreate, ClientOut, ClientPatch, ClientUpdate
from schemas.facture import FactureOut

router = APIRouter(prefix="/clients", tags=["Clients"])


def _doc_to_client(doc) -> ClientOut:
    data = doc.to_dict()
    data["client_id"] = doc.id
    return ClientOut(**data)


@router.get("", response_model=List[ClientOut])
async def list_clients(
    search: str = "",
    _user: dict = Depends(verify_token),
):
    db = get_db()
    query = db.collection("clients")
    docs = query.stream()
    clients = [_doc_to_client(d) for d in docs]

    if search:
        s = search.lower()
        clients = [
            c for c in clients
            if s in c.nom.lower() or s in c.telephone.lower()
        ]

    return clients


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(
    body: ClientCreate,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    data = body.model_dump()
    data["active"] = True
    data["date_creation"] = datetime.now(timezone.utc).isoformat()

    ref = db.collection("clients").document()
    ref.set(data)

    data["client_id"] = ref.id
    return ClientOut(**data)


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: str,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    doc = db.collection("clients").document(client_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Client introuvable")
    return _doc_to_client(doc)


@router.put("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: str,
    body: ClientUpdate,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    ref = db.collection("clients").document(client_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Client introuvable")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ref.update(updates)

    data = {**doc.to_dict(), **updates, "client_id": client_id}
    return ClientOut(**data)


@router.patch("/{client_id}", response_model=ClientOut)
async def patch_client(
    client_id: str,
    body: ClientPatch,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    ref = db.collection("clients").document(client_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Client introuvable")

    ref.update({"active": body.active})
    data = {**doc.to_dict(), "active": body.active, "client_id": client_id}
    return ClientOut(**data)


@router.get("/{client_id}/factures", response_model=List[FactureOut])
async def get_client_factures(
    client_id: str,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    # Vérifie que le client existe
    client_doc = db.collection("clients").document(client_id).get()
    if not client_doc.exists:
        raise HTTPException(status_code=404, detail="Client introuvable")

    client_nom = client_doc.to_dict().get("nom", "")
    docs = (
        db.collection("factures")
        .where("client_id", "==", client_id)
        .order_by("date_creation", direction="DESCENDING")
        .stream()
    )

    factures = []
    for doc in docs:
        data = doc.to_dict()
        data["facture_id"] = doc.id
        data["client_nom"] = client_nom
        factures.append(FactureOut(**data))

    return factures
