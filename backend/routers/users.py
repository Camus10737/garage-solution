from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import auth

from core.firebase import get_db
from core.permissions import require_roles
from schemas.user import ROLES, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/utilisateurs", tags=["Utilisateurs"])


def _doc_to_user(doc, email: str) -> UserOut:
    data = doc.to_dict()
    return UserOut(
        uid=doc.id,
        nom=data.get("nom", ""),
        email=email,
        telephone=data.get("telephone"),
        garage_id=data["garage_id"],
        role=data["role"],
        actif=data.get("actif", False),
        date_creation=data.get("date_creation", ""),
    )


def _nb_admins_actifs(db, garage_id: str, exclure_uid: str | None = None) -> int:
    docs = (
        db.collection("users")
        .where("garage_id", "==", garage_id)
        .where("role", "==", "admin")
        .where("actif", "==", True)
        .stream()
    )
    return sum(1 for d in docs if d.id != exclure_uid)


@router.get("", response_model=List[UserOut])
async def list_utilisateurs(_user: dict = Depends(require_roles("admin"))):
    db = get_db()
    docs = list(db.collection("users").where("garage_id", "==", _user["garage_id"]).stream())

    resultats = []
    for doc in docs:
        try:
            email = auth.get_user(doc.id).email or ""
        except auth.UserNotFoundError:
            email = ""
        resultats.append(_doc_to_user(doc, email))
    return resultats


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_utilisateur(body: UserCreate, _user: dict = Depends(require_roles("admin"))):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Rôle invalide")

    try:
        firebase_user = auth.create_user(email=body.email, password=body.password, display_name=body.nom)
    except auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Cette adresse email est déjà utilisée")

    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "garage_id": _user["garage_id"],
        "nom": body.nom,
        "telephone": body.telephone,
        "role": body.role,
        "actif": True,
        "date_creation": now,
    }
    db.collection("users").document(firebase_user.uid).set(data)

    return UserOut(
        uid=firebase_user.uid,
        nom=data["nom"],
        email=body.email,
        telephone=data["telephone"],
        garage_id=data["garage_id"],
        role=data["role"],
        actif=data["actif"],
        date_creation=data["date_creation"],
    )


@router.patch("/{uid}", response_model=UserOut)
async def update_utilisateur(uid: str, body: UserUpdate, _user: dict = Depends(require_roles("admin"))):
    db = get_db()
    ref = db.collection("users").document(uid)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("garage_id") != _user["garage_id"]:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    data = doc.to_dict()
    if body.role is not None and body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Rôle invalide")

    devient_inactif = body.actif is False and data.get("actif", False)
    quitte_role_admin = body.role is not None and body.role != "admin" and data.get("role") == "admin"
    if data.get("role") == "admin" and (devient_inactif or quitte_role_admin):
        if _nb_admins_actifs(db, _user["garage_id"], exclure_uid=uid) < 1:
            raise HTTPException(
                status_code=400,
                detail="Impossible : ce garage n'aurait alors plus aucun Admin actif",
            )

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ref.update(updates)

    try:
        email = auth.get_user(uid).email or ""
    except auth.UserNotFoundError:
        email = ""

    return _doc_to_user(ref.get(), email)
