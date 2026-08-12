from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.firebase import get_db
from core.permissions import require_roles
from core.tenant import verifier_appartenance
from schemas.commande_speciale import (
    CommandeSpecialeCreate,
    CommandeSpecialeOut,
    CommandeSpecialePatch,
)
from services.notification_service import envoyer_notification_piece_recue

router = APIRouter(prefix="/commandes-speciales", tags=["Commandes spéciales"])


def _enrich(data: dict, client_nom: str = "", fournisseur_nom: str = "") -> CommandeSpecialeOut:
    data["client_nom"] = client_nom
    data["fournisseur_nom"] = fournisseur_nom
    return CommandeSpecialeOut(**data)


def _marquer_recue(db, commande_speciale_id: str, incrementer_stock: bool) -> None:
    """Marque une commande spéciale comme reçue : incrémente le stock si demandé (pas nécessaire si déjà
    fait via la réception d'une commande fournisseur liée), envoie la notification client.
    """
    ref = db.collection("commandes_speciales").document(commande_speciale_id)
    doc = ref.get()
    if not doc.exists:
        return
    data = doc.to_dict()
    if data.get("statut") == "recue":
        return

    now = datetime.now(timezone.utc).isoformat()

    if incrementer_stock:
        piece_ref = db.collection("pieces").document(data["piece_id"])
        piece_doc = piece_ref.get()
        if piece_doc.exists:
            stock_actuel = piece_doc.to_dict().get("quantite")
            if stock_actuel is not None:
                piece_ref.update({"quantite": stock_actuel + data["quantite"]})
        db.collection("mouvements_stock").document().set({
            "garage_id": data.get("garage_id"),
            "piece_id": data["piece_id"],
            "type": "entree",
            "quantite": data["quantite"],
            "source": "commande_speciale",
            "reference_id": commande_speciale_id,
            "date": now,
        })

    ref.update({"statut": "recue", "date_reception": now})

    client_doc = db.collection("clients").document(data["client_id"]).get()
    if client_doc.exists:
        client_data = client_doc.to_dict()
        try:
            envoyer_notification_piece_recue(
                db=db,
                garage_id=data.get("garage_id"),
                commande_speciale_id=commande_speciale_id,
                client_id=data["client_id"],
                client_nom=client_data.get("nom", ""),
                client_telephone=client_data.get("telephone", ""),
                client_email=client_data.get("email"),
                piece_nom=data["piece_nom"],
            )
        except Exception:
            pass


@router.get("", response_model=List[CommandeSpecialeOut])
async def list_commandes_speciales(
    client_id: str = "",
    statut: str = "",
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    query = (
        db.collection("commandes_speciales")
        .where("garage_id", "==", _user["garage_id"])
        .order_by("date_commande", direction="DESCENDING")
    )
    if client_id:
        query = query.where("client_id", "==", client_id)
    if statut in ("commandee", "en_transit", "recue"):
        query = query.where("statut", "==", statut)
    docs = list(query.stream())

    client_ids = list({d.to_dict().get("client_id") for d in docs if d.to_dict().get("client_id")})
    fournisseur_ids = list({d.to_dict().get("fournisseur_id") for d in docs if d.to_dict().get("fournisseur_id")})
    client_noms: dict[str, str] = {}
    fournisseur_noms: dict[str, str] = {}
    if client_ids:
        for cdoc in db.get_all([db.collection("clients").document(cid) for cid in client_ids]):
            if cdoc.exists:
                client_noms[cdoc.id] = cdoc.to_dict().get("nom", "")
    if fournisseur_ids:
        for fdoc in db.get_all([db.collection("fournisseurs").document(fid) for fid in fournisseur_ids]):
            if fdoc.exists:
                fournisseur_noms[fdoc.id] = fdoc.to_dict().get("nom", "")

    result = []
    for doc in docs:
        data = doc.to_dict()
        data["commande_speciale_id"] = doc.id
        result.append(_enrich(
            data,
            client_noms.get(data.get("client_id", ""), ""),
            fournisseur_noms.get(data.get("fournisseur_id", ""), ""),
        ))
    return result


@router.post("", response_model=CommandeSpecialeOut, status_code=status.HTTP_201_CREATED)
async def create_commande_speciale(
    body: CommandeSpecialeCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    client_doc = db.collection("clients").document(body.client_id).get()
    verifier_appartenance(client_doc, _user["garage_id"], "Client introuvable")
    fournisseur_doc = db.collection("fournisseurs").document(body.fournisseur_id).get()
    verifier_appartenance(fournisseur_doc, _user["garage_id"], "Fournisseur introuvable")

    data = {
        **body.model_dump(),
        "garage_id": _user["garage_id"],
        "statut": "commandee",
        "date_commande": datetime.now(timezone.utc).isoformat(),
        "date_reception": None,
    }
    ref = db.collection("commandes_speciales").document()
    ref.set(data)
    data["commande_speciale_id"] = ref.id
    return _enrich(data, client_doc.to_dict().get("nom", ""), fournisseur_doc.to_dict().get("nom", ""))


@router.get("/{commande_speciale_id}", response_model=CommandeSpecialeOut)
async def get_commande_speciale(
    commande_speciale_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    doc = db.collection("commandes_speciales").document(commande_speciale_id).get()
    data = verifier_appartenance(doc, _user["garage_id"], "Commande spéciale introuvable")
    data["commande_speciale_id"] = doc.id

    client_doc = db.collection("clients").document(data["client_id"]).get()
    fournisseur_doc = db.collection("fournisseurs").document(data["fournisseur_id"]).get()
    return _enrich(
        data,
        client_doc.to_dict().get("nom", "") if client_doc.exists else "",
        fournisseur_doc.to_dict().get("nom", "") if fournisseur_doc.exists else "",
    )


@router.patch("/{commande_speciale_id}", response_model=CommandeSpecialeOut)
async def patch_commande_speciale(
    commande_speciale_id: str,
    body: CommandeSpecialePatch,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("commandes_speciales").document(commande_speciale_id)
    doc = ref.get()
    data = verifier_appartenance(doc, _user["garage_id"], "Commande spéciale introuvable")
    if data.get("statut") == "recue":
        raise HTTPException(status_code=400, detail="Cette commande spéciale est déjà reçue")

    if body.statut == "recue":
        _marquer_recue(db, commande_speciale_id, incrementer_stock=True)
    else:
        ref.update({"statut": body.statut})

    doc = ref.get()
    data = doc.to_dict()
    data["commande_speciale_id"] = commande_speciale_id

    client_doc = db.collection("clients").document(data["client_id"]).get()
    fournisseur_doc = db.collection("fournisseurs").document(data["fournisseur_id"]).get()
    return _enrich(
        data,
        client_doc.to_dict().get("nom", "") if client_doc.exists else "",
        fournisseur_doc.to_dict().get("nom", "") if fournisseur_doc.exists else "",
    )
