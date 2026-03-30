from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import verify_token
from core.firebase import get_db
from schemas.service import ServiceCreate, ServiceOut, ServicePatch, ServiceUpdate

router = APIRouter(prefix="/services", tags=["Services"])


def _doc_to_service(doc) -> ServiceOut:
    data = doc.to_dict()
    data["service_id"] = doc.id
    return ServiceOut(**data)


@router.get("", response_model=List[ServiceOut])
async def list_services(
    active_only: bool = False,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    query = db.collection("services")
    if active_only:
        query = query.where("active", "==", True)
    docs = query.stream()
    return [_doc_to_service(d) for d in docs]


@router.post("", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service(
    body: ServiceCreate,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    data = body.model_dump()
    data["active"] = True

    ref = db.collection("services").document()
    ref.set(data)

    data["service_id"] = ref.id
    return ServiceOut(**data)


@router.get("/{service_id}", response_model=ServiceOut)
async def get_service(
    service_id: str,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    doc = db.collection("services").document(service_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Service introuvable")
    return _doc_to_service(doc)


@router.put("/{service_id}", response_model=ServiceOut)
async def update_service(
    service_id: str,
    body: ServiceUpdate,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    ref = db.collection("services").document(service_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Service introuvable")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ref.update(updates)
    data = {**doc.to_dict(), **updates, "service_id": service_id}
    return ServiceOut(**data)


@router.patch("/{service_id}", response_model=ServiceOut)
async def patch_service(
    service_id: str,
    body: ServicePatch,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    ref = db.collection("services").document(service_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Service introuvable")

    ref.update({"active": body.active})
    data = {**doc.to_dict(), "active": body.active, "service_id": service_id}
    return ServiceOut(**data)
