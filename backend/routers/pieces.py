from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.firebase import get_db
from core.permissions import require_roles
from core.tenant import verifier_appartenance
from schemas.mouvement_stock import MouvementStockOut
from schemas.piece import PieceCreate, PieceOut, PiecePatch, PieceUpdate

router = APIRouter(prefix="/pieces", tags=["Pièces"])


def _doc_to_piece(doc) -> PieceOut:
    data = doc.to_dict()
    data["piece_id"] = doc.id
    return PieceOut(**data)


def _verifier_numero_item_unique(db, garage_id: str, numero_item: str, exclude_piece_id: str | None = None) -> None:
    if not numero_item:
        return
    docs = (
        db.collection("pieces")
        .where("garage_id", "==", garage_id)
        .where("numero_item", "==", numero_item)
        .stream()
    )
    for doc in docs:
        if doc.id != exclude_piece_id:
            raise HTTPException(status_code=400, detail=f"Le numéro d'item « {numero_item} » est déjà utilisé")


@router.get("", response_model=List[PieceOut])
async def list_pieces(
    active_only: bool = False,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    query = db.collection("pieces").where("garage_id", "==", _user["garage_id"])
    if active_only:
        query = query.where("active", "==", True)
    docs = query.stream()
    return [_doc_to_piece(d) for d in docs]


@router.post("", response_model=PieceOut, status_code=status.HTTP_201_CREATED)
async def create_piece(
    body: PieceCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    _verifier_numero_item_unique(db, _user["garage_id"], body.numero_item)
    data = body.model_dump()
    data["garage_id"] = _user["garage_id"]
    data["active"] = True

    ref = db.collection("pieces").document()
    ref.set(data)

    data["piece_id"] = ref.id
    return PieceOut(**data)


@router.get("/{piece_id}", response_model=PieceOut)
async def get_piece(
    piece_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    doc = db.collection("pieces").document(piece_id).get()
    verifier_appartenance(doc, _user["garage_id"], "Pièce introuvable")
    return _doc_to_piece(doc)


@router.put("/{piece_id}", response_model=PieceOut)
async def update_piece(
    piece_id: str,
    body: PieceUpdate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("pieces").document(piece_id)
    doc = ref.get()
    verifier_appartenance(doc, _user["garage_id"], "Pièce introuvable")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "numero_item" in updates:
        _verifier_numero_item_unique(db, _user["garage_id"], updates["numero_item"], exclude_piece_id=piece_id)
    ref.update(updates)
    data = {**doc.to_dict(), **updates, "piece_id": piece_id}
    return PieceOut(**data)


@router.patch("/{piece_id}", response_model=PieceOut)
async def patch_piece(
    piece_id: str,
    body: PiecePatch,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("pieces").document(piece_id)
    doc = ref.get()
    verifier_appartenance(doc, _user["garage_id"], "Pièce introuvable")

    ref.update({"active": body.active})
    data = {**doc.to_dict(), "active": body.active, "piece_id": piece_id}
    return PieceOut(**data)


@router.get("/{piece_id}/mouvements", response_model=List[MouvementStockOut])
async def get_mouvements_piece(
    piece_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    doc = db.collection("pieces").document(piece_id).get()
    verifier_appartenance(doc, _user["garage_id"], "Pièce introuvable")

    docs = (
        db.collection("mouvements_stock")
        .where("garage_id", "==", _user["garage_id"])
        .where("piece_id", "==", piece_id)
        .order_by("date", direction="DESCENDING")
        .stream()
    )
    mouvements = []
    for d in docs:
        data = d.to_dict()
        data["mouvement_id"] = d.id
        mouvements.append(MouvementStockOut(**data))
    return mouvements
