from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import verify_token
from core.firebase import get_db
from schemas.piece import PieceCreate, PieceOut, PiecePatch, PieceUpdate

router = APIRouter(prefix="/pieces", tags=["Pièces"])


def _doc_to_piece(doc) -> PieceOut:
    data = doc.to_dict()
    data["piece_id"] = doc.id
    return PieceOut(**data)


@router.get("", response_model=List[PieceOut])
async def list_pieces(
    active_only: bool = False,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    query = db.collection("pieces")
    if active_only:
        query = query.where("active", "==", True)
    docs = query.stream()
    return [_doc_to_piece(d) for d in docs]


@router.post("", response_model=PieceOut, status_code=status.HTTP_201_CREATED)
async def create_piece(
    body: PieceCreate,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    data = body.model_dump()
    data["active"] = True

    ref = db.collection("pieces").document()
    ref.set(data)

    data["piece_id"] = ref.id
    return PieceOut(**data)


@router.get("/{piece_id}", response_model=PieceOut)
async def get_piece(
    piece_id: str,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    doc = db.collection("pieces").document(piece_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Pièce introuvable")
    return _doc_to_piece(doc)


@router.put("/{piece_id}", response_model=PieceOut)
async def update_piece(
    piece_id: str,
    body: PieceUpdate,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    ref = db.collection("pieces").document(piece_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Pièce introuvable")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ref.update(updates)
    data = {**doc.to_dict(), **updates, "piece_id": piece_id}
    return PieceOut(**data)


@router.patch("/{piece_id}", response_model=PieceOut)
async def patch_piece(
    piece_id: str,
    body: PiecePatch,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    ref = db.collection("pieces").document(piece_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Pièce introuvable")

    ref.update({"active": body.active})
    data = {**doc.to_dict(), "active": body.active, "piece_id": piece_id}
    return PieceOut(**data)
