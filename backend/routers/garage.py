import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from core.auth import verify_token, verify_token_raw
from core.firebase import get_bucket, get_db
from core.permissions import require_roles
from schemas.garage import GarageCreate, GarageOut, GaragePublicOut, GarageUpdate

router = APIRouter(tags=["Garage"])


def _doc_to_garage(doc) -> GarageOut:
    data = doc.to_dict()
    data["garage_id"] = doc.id
    return GarageOut(**data)


@router.post("/garages", response_model=GarageOut, status_code=status.HTTP_201_CREATED)
async def creer_garage(body: GarageCreate, _claims: dict = Depends(verify_token_raw)):
    db = get_db()
    uid = _claims["uid"]

    if db.collection("users").document(uid).get().exists:
        raise HTTPException(status_code=400, detail="Ce compte est déjà associé à un garage")

    now = datetime.now(timezone.utc).isoformat()
    garage_ref = db.collection("garages").document()
    garage_ref.set({"nom": body.nom_garage, "date_creation": now})

    db.collection("users").document(uid).set({
        "garage_id": garage_ref.id,
        "nom": body.nom_utilisateur,
        "telephone": None,
        "role": "admin",
        "actif": True,
        "date_creation": now,
    })

    return _doc_to_garage(garage_ref.get())


@router.get("/garage", response_model=GarageOut)
async def get_garage(_user: dict = Depends(verify_token)):
    db = get_db()
    doc = db.collection("garages").document(_user["garage_id"]).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Garage introuvable")
    return _doc_to_garage(doc)


@router.put("/garage", response_model=GarageOut)
async def update_garage(body: GarageUpdate, _user: dict = Depends(require_roles("admin"))):
    db = get_db()
    ref = db.collection("garages").document(_user["garage_id"])
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Garage introuvable")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ref.update(updates)
    return _doc_to_garage(ref.get())


@router.post("/garage/logo", response_model=GarageOut)
async def upload_logo(file: UploadFile = File(...), _user: dict = Depends(require_roles("admin"))):
    bucket = get_bucket()
    extension = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png"
    blob = bucket.blob(f"logos/{_user['garage_id']}-{uuid.uuid4().hex}.{extension}")
    blob.upload_from_file(file.file, content_type=file.content_type or "image/png")
    blob.make_public()

    db = get_db()
    ref = db.collection("garages").document(_user["garage_id"])
    ref.update({"logo_url": blob.public_url})
    return _doc_to_garage(ref.get())


@router.get("/garage/{garage_id}/public", response_model=GaragePublicOut)
async def get_garage_public(garage_id: str):
    db = get_db()
    doc = db.collection("garages").document(garage_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Garage introuvable")
    data = doc.to_dict()
    return GaragePublicOut(
        nom=data.get("nom", ""),
        adresse=data.get("adresse"),
        telephone=data.get("telephone"),
        logo_url=data.get("logo_url"),
    )
